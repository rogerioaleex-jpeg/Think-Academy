import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ILabDriver, LabProvisionSpec, LabProvisionResult } from './lab-driver.interface';
import { shQuote } from './shell-utils';

const run = promisify(exec);

/**
 * Driver Docker. Provisiona cada lab em um contêiner efêmero anexado a uma
 * rede ISOLADA (internal), com limites de CPU/memória e auto-remoção.
 *
 * Flags de segurança aplicadas:
 *   --network <rede-isolada>   → sem rota para a rede corporativa/internet
 *   --cpus / --memory          → quotas de recurso
 *   --pids-limit               → evita fork bombs
 *   --cap-drop ALL             → remove todas as capabilities do kernel
 *   --security-opt no-new-privileges
 *   --read-only                → filesystem imutável (dados em tmpfs)
 *
 * Se o Docker não estiver disponível (ex.: ambiente de dev sem daemon), o
 * driver opera em modo SIMULAÇÃO para não quebrar o fluxo da aplicação.
 */
@Injectable()
export class DockerLabDriver implements ILabDriver {
  readonly name = 'docker';
  private readonly logger = new Logger(DockerLabDriver.name);
  private dockerAvailable: boolean | null = null;

  private async hasDocker(): Promise<boolean> {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    try {
      await run('docker version --format "{{.Server.Version}}"');
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
      this.logger.warn('Docker indisponível — labs rodarão em modo SIMULAÇÃO.');
    }
    return this.dockerAvailable;
  }

  private async ensureNetwork(network: string): Promise<void> {
    // Cria a rede isolada (internal) se ainda não existir.
    try {
      await run(`docker network inspect ${network}`);
    } catch {
      await run(`docker network create --internal ${network}`);
      this.logger.log(`Rede isolada criada: ${network}`);
    }
  }

  async provision(spec: LabProvisionSpec): Promise<LabProvisionResult> {
    const containerName = `tica-lab-${spec.instanceId}`;
    if (!(await this.hasDocker())) {
      return { externalRef: `sim-${spec.instanceId}`, accessUrl: null, networkId: spec.network };
    }
    await this.ensureNetwork(spec.network);

    // BUG real corrigido aqui: este driver sempre retornava `accessUrl:
    // null`, incondicionalmente — NENHUM lab DOCKER jamais teve uma URL de
    // acesso de verdade, mesmo com o container rodando. Mesmo problema (e
    // mesma solução) já resolvidos pro driver de VM: `-p 0:<porta>` não
    // publica nada numa rede `internal:true` (validado em produção), então
    // o modo padrão precisa ser `traefik-labels` — mesma env
    // LAB_VM_ACCESS_MODE do VmLabDriver, é a mesma infraestrutura de rede.
    const accessMode = process.env.LAB_VM_ACCESS_MODE ?? 'traefik-labels';
    const primaryPort = spec.exposedPorts[0];
    const traefikLabels =
      accessMode === 'traefik-labels' && primaryPort
        ? [
            '--label traefik.enable=true',
            `--label ${shQuote(`traefik.http.routers.lab-${spec.instanceId}.rule=Host(\`lab-${spec.instanceId}.${process.env.LAB_PUBLIC_DOMAIN}\`)`)}`,
            `--label traefik.http.services.lab-${spec.instanceId}.loadbalancer.server.port=${primaryPort}`,
          ]
        : [];
    const directPorts =
      accessMode === 'direct-port' ? spec.exposedPorts.map((p) => `-p 0:${p}`) : [];

    const cmd = [
      'docker run -d',
      `--name ${containerName}`,
      `--network ${spec.network}`,
      `--cpus=${spec.cpuLimit}`,
      `--memory=${spec.memoryLimitMb}m`,
      '--pids-limit=256',
      '--cap-drop ALL',
      '--security-opt no-new-privileges',
      '--read-only',
      '--tmpfs /tmp',
      ...directPorts,
      ...traefikLabels,
      spec.image,
    ]
      .filter(Boolean)
      .join(' ');

    const { stdout } = await run(cmd);
    const externalRef = stdout.trim();

    let accessUrl: string | null = null;
    if (accessMode === 'traefik-labels' && primaryPort) {
      accessUrl = `https://lab-${spec.instanceId}.${process.env.LAB_PUBLIC_DOMAIN}/`;
    } else if (accessMode === 'direct-port' && primaryPort) {
      accessUrl = await this.resolveDirectPortUrl(externalRef, primaryPort);
    }

    this.logger.log(`Lab provisionado: ${containerName} (${externalRef.slice(0, 12)})`);
    return { externalRef, accessUrl, networkId: spec.network };
  }

  private async resolveDirectPortUrl(ref: string, internalPort: number): Promise<string | null> {
    try {
      const { stdout } = await run(`docker port ${ref} ${internalPort}/tcp`);
      const m = stdout.trim().match(/:(\d+)$/);
      return m ? `http://${process.env.LAB_VM_HOST ?? 'localhost'}:${m[1]}/` : null;
    } catch {
      return null;
    }
  }

  async destroy(externalRef: string): Promise<void> {
    if (externalRef.startsWith('sim-')) return;
    if (!(await this.hasDocker())) return;
    try {
      await run(`docker rm -f ${externalRef}`);
      this.logger.log(`Lab destruído: ${externalRef.slice(0, 12)}`);
    } catch (e) {
      this.logger.error(`Falha ao destruir ${externalRef}: ${(e as Error).message}`);
    }
  }
}
