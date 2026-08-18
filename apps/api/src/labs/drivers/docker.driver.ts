import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ILabDriver, LabProvisionSpec, LabProvisionResult } from './lab-driver.interface';

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

    const ports = spec.exposedPorts.map((p) => `-p 0:${p}`).join(' ');
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
      ports,
      spec.image,
    ].join(' ');

    const { stdout } = await run(cmd);
    const externalRef = stdout.trim();
    this.logger.log(`Lab provisionado: ${containerName} (${externalRef.slice(0, 12)})`);
    return { externalRef, accessUrl: null, networkId: spec.network };
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
