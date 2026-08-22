import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ILabDriver, LabProvisionSpec, LabProvisionResult } from './lab-driver.interface';

const run = promisify(exec);

/**
 * Escapa uma string para uso segura como argumento de shell (POSIX
 * single-quote escaping). Necessário porque `exec()` roda o comando via
 * `/bin/sh -c "<string>"` — sem isso, valores com backtick/parênteses (como
 * a regra `Host(\`...\`)` do Traefik) quebram o shell. Validado em produção:
 * sem essa proteção, `docker run` falhava com
 * `/bin/sh: Syntax error: "(" unexpected`.
 */
const shQuote = (v: string) => `'${v.replace(/'/g, `'"'"'`)}'`;

type OsType = 'WINDOWS10' | 'UBUNTU_DESKTOP';

interface OsDefaults {
  image: string;
  needsKvm: boolean;
  webPort: number;
  rdpPort: number | null;
  accessPath: string;
  env: (spec: LabProvisionSpec) => string[];
}

/**
 * Configuração por sistema operacional.
 *  - WINDOWS10: `dockurr/windows` — QEMU dentro do container, baixa a ISO de
 *    avaliação oficial da Microsoft (trial de 90 dias) no primeiro boot.
 *    Exige `/dev/kvm` no host do Docker (virtualização de hardware) — sem
 *    isso o boot seria inviavelmente lento em emulação de software.
 *  - UBUNTU_DESKTOP: `dorowu/ubuntu-desktop-lxde-vnc` — desktop Ubuntu real
 *    dentro de um container comum, sem precisar de KVM.
 * Portas/paths confirmados na documentação pública dessas imagens — validar
 * ao trocar de versão, pois podem mudar entre releases.
 */
const OS_DEFAULTS: Record<OsType, OsDefaults> = {
  WINDOWS10: {
    image: 'dockurr/windows',
    needsKvm: true,
    webPort: 8006,
    rdpPort: 3389,
    accessPath: '/',
    env: (spec) => [
      `VERSION=${spec.vmVersion ?? '10'}`,
      `RAM_SIZE=${Math.max(2, Math.floor(spec.memoryLimitMb / 1024))}G`,
      `CPU_CORES=${spec.cpuLimit}`,
      'DISK_SIZE=32G',
    ],
  },
  UBUNTU_DESKTOP: {
    image: 'dorowu/ubuntu-desktop-lxde-vnc',
    needsKvm: false,
    webPort: 80,
    rdpPort: null,
    accessPath: '/',
    env: () => ['VNC_PASSWORD=disabled', 'RESOLUTION=1280x800'],
  },
};

/**
 * Driver de VM completa (QEMU-em-container para Windows; container de
 * desktop comum para Ubuntu). Mesmo padrão de feature-detect + modo
 * SIMULAÇÃO do DockerLabDriver, com uma checagem adicional de KVM.
 *
 * Diferenças de segurança em relação ao DockerLabDriver (ver
 * docs/01-architecture.md):
 *  - NÃO usa --cap-drop ALL / --read-only: o QEMU precisa escrever o disco
 *    virtual em /storage, e o driver Windows precisa de NET_ADMIN para
 *    criar a interface de rede interna da própria VM.
 *  - --security-opt no-new-privileges e limites de cpu/memória/pids são
 *    mantidos.
 *  - A rede isolada (`internal: true`) passa a ser a ÚNICA linha de defesa
 *    contra saída para a internet/rede corporativa — é obrigatória, sem
 *    exceção, dado que a superfície de uma VM completa é maior que a de um
 *    container CTF.
 */
@Injectable()
export class VmLabDriver implements ILabDriver {
  readonly name = 'vm';
  private readonly logger = new Logger(VmLabDriver.name);
  private dockerAvailable: boolean | null = null;
  private kvmAvailable: boolean | null = null;

  private async hasDocker(): Promise<boolean> {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    try {
      await run('docker version --format "{{.Server.Version}}"');
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
      this.logger.warn('Docker indisponível — labs de VM rodarão em modo SIMULAÇÃO.');
    }
    return this.dockerAvailable;
  }

  /**
   * Testa /dev/kvm no host onde o dockerd realmente roda (não no processo
   * Nest) — relevante porque em produção a API fala com um host dedicado
   * remoto via DOCKER_HOST. Por isso o teste é feito com `docker run`
   * (executa no host do daemon), não com `fs.access` local.
   */
  private async hasKvm(): Promise<boolean> {
    if (this.kvmAvailable !== null) return this.kvmAvailable;
    try {
      await run('docker run --rm --device=/dev/kvm alpine test -e /dev/kvm');
      this.kvmAvailable = true;
    } catch {
      this.kvmAvailable = false;
      this.logger.warn('/dev/kvm indisponível no host do Docker — labs Windows cairão em modo SIMULAÇÃO (Ubuntu Desktop continua funcionando sem KVM).');
    }
    return this.kvmAvailable;
  }

  private async ensureNetwork(network: string): Promise<void> {
    try {
      await run(`docker network inspect ${network}`);
    } catch {
      await run(`docker network create --internal ${network}`);
      this.logger.log(`Rede isolada criada: ${network}`);
    }
  }

  /**
   * IMPORTANTE (validado na prática, não só em teoria): redes Docker
   * `internal: true` NÃO publicam portas — `-p host:container` nelas não
   * gera nenhum binding no host, mesmo sem erro aparente. Isso significa que
   * o modo `direct-port` (baseado em `docker port`) é estruturalmente
   * incompatível com a rede isolada obrigatória (`tica-labs-isolated`).
   * Comunicação container-a-container dentro da rede internal funciona
   * normalmente — por isso o modo `traefik-labels` (Traefik com uma pata
   * na rede isolada e outra numa rede com saída) é o único jeito real de
   * expor essas VMs sem abrir mão do isolamento. Ver infra/labs/README.md.
   */
  private async isNetworkInternal(network: string): Promise<boolean> {
    try {
      const { stdout } = await run(`docker network inspect ${network} --format "{{.Internal}}"`);
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  async provision(spec: LabProvisionSpec): Promise<LabProvisionResult> {
    const osType = (spec.osType ?? 'UBUNTU_DESKTOP') as OsType;
    const def = OS_DEFAULTS[osType];
    const containerName = `tica-vm-${spec.instanceId}`;
    const volumeName = `tica-vm-vol-${spec.instanceId}`;

    if (!(await this.hasDocker())) {
      return { externalRef: `sim-${spec.instanceId}`, accessUrl: null, networkId: spec.network };
    }
    if (def.needsKvm && !(await this.hasKvm())) {
      return { externalRef: `sim-${spec.instanceId}`, accessUrl: null, networkId: spec.network };
    }
    await this.ensureNetwork(spec.network);

    // Padrão é traefik-labels: é o único modo que funciona com a rede
    // isolada obrigatória (ver isNetworkInternal acima). direct-port só
    // deve ser usado com uma rede explicitamente NÃO internal, para testes
    // locais que abrem mão da garantia de isolamento.
    const accessMode = process.env.LAB_VM_ACCESS_MODE ?? 'traefik-labels';
    if (accessMode === 'direct-port' && (await this.isNetworkInternal(spec.network))) {
      this.logger.error(
        `LAB_VM_ACCESS_MODE=direct-port não funciona com "${spec.network}" (internal:true) — ` +
          'Docker não publica portas em redes internal. Use LAB_VM_ACCESS_MODE=traefik-labels, ' +
          'ou aponte LAB_NETWORK para uma rede NÃO internal só para teste local sem garantia de isolamento.',
      );
    }
    // SEM `tls.certresolver` por instância de propósito: emitir um
    // certificado Let's Encrypt NOVO por instância levava ~50s em produção
    // (o console parecia "não abrir nenhuma máquina" nesse meio-tempo) e
    // arriscaria o limite semanal de emissões do Let's Encrypt em uso real
    // com várias instâncias/resets. O Traefik já obtém UM certificado
    // wildcard (`*.${LAB_PUBLIC_DOMAIN}`) uma única vez, na inicialização —
    // ver docker-compose.labs.yml — e ele cobre qualquer `lab-<id>.<domínio>`
    // automaticamente, sem emissão por instância.
    const traefikLabels =
      accessMode === 'traefik-labels'
        ? [
            '--label traefik.enable=true',
            `--label ${shQuote(`traefik.http.routers.lab-${spec.instanceId}.rule=Host(\`lab-${spec.instanceId}.${process.env.LAB_PUBLIC_DOMAIN}\`)`)}`,
            `--label traefik.http.services.lab-${spec.instanceId}.loadbalancer.server.port=${def.webPort}`,
          ]
        : [];

    const cmd = [
      'docker run -d',
      `--name ${containerName}`,
      `--network ${spec.network}`,
      def.needsKvm ? '--device=/dev/kvm --cap-add NET_ADMIN' : '',
      `--cpus=${spec.cpuLimit}`,
      `--memory=${spec.memoryLimitMb}m`,
      '--pids-limit=512',
      '--security-opt no-new-privileges',
      // SEM --cap-drop ALL / --read-only — ver docstring da classe.
      `-v ${volumeName}:/storage`,
      accessMode === 'direct-port' ? `-p 0:${def.webPort}` : '',
      accessMode === 'direct-port' && def.rdpPort ? `-p 0:${def.rdpPort}` : '',
      ...traefikLabels,
      ...def.env(spec).map((e) => `-e ${e}`),
      spec.image || def.image,
    ]
      .filter(Boolean)
      .join(' ');

    const { stdout } = await run(cmd);
    const externalRef = stdout.trim();

    let accessUrl: string | null;
    let vncPort: number | undefined;
    let rdpPort: number | undefined;

    if (accessMode === 'traefik-labels') {
      accessUrl = `https://lab-${spec.instanceId}.${process.env.LAB_PUBLIC_DOMAIN}${def.accessPath}`;
    } else {
      vncPort = (await this.publishedPort(externalRef, def.webPort)) ?? undefined;
      rdpPort = def.rdpPort ? (await this.publishedPort(externalRef, def.rdpPort)) ?? undefined : undefined;
      accessUrl = vncPort ? `http://${process.env.LAB_VM_HOST ?? 'localhost'}:${vncPort}${def.accessPath}` : null;
    }

    this.logger.log(`VM provisionada (${osType}): ${containerName} (${externalRef.slice(0, 12)})`);
    return { externalRef, accessUrl, networkId: spec.network, vncPort, rdpPort };
  }

  private async publishedPort(ref: string, internalPort: number): Promise<number | null> {
    try {
      const { stdout } = await run(`docker port ${ref} ${internalPort}/tcp`);
      const m = stdout.trim().match(/:(\d+)$/);
      return m ? Number(m[1]) : null;
    } catch {
      return null;
    }
  }

  async destroy(externalRef: string): Promise<void> {
    if (externalRef.startsWith('sim-')) return;
    if (!(await this.hasDocker())) return;
    try {
      // `externalRef` é o ID do container (retorno de `docker run -d`), não
      // o nome — recupera o nome pra descobrir o volume nomeado associado
      // (tica-vm-vol-<instanceId>) antes de remover o container.
      let volumeName: string | null = null;
      try {
        const { stdout } = await run(`docker inspect --format "{{.Name}}" ${externalRef}`);
        const name = stdout.trim().replace(/^\//, ''); // ex.: tica-vm-<instanceId>
        if (name.startsWith('tica-vm-')) {
          volumeName = `tica-vm-vol-${name.slice('tica-vm-'.length)}`;
        }
      } catch {
        // Container já pode ter sido removido — segue sem volume conhecido.
      }

      await run(`docker rm -f ${externalRef}`);
      // Remove também o volume nomeado — discos de VM (qcow2) são grandes
      // (10-30GB); sem isso o host dedicado enche de disco rapidamente.
      if (volumeName) {
        await run(`docker volume rm -f ${volumeName}`).catch(() => undefined);
      }
      this.logger.log(`VM destruída: ${externalRef.slice(0, 12)}`);
    } catch (e) {
      this.logger.error(`Falha ao destruir VM ${externalRef}: ${(e as Error).message}`);
    }
  }
}
