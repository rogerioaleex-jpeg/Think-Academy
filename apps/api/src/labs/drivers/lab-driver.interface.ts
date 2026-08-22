/**
 * Contrato de qualquer orquestrador de laboratório (Docker, Kubernetes, VM).
 * Toda implementação DEVE garantir isolamento de rede — os ambientes de lab
 * nunca podem alcançar a rede corporativa nem sistemas reais.
 */
export interface LabProvisionSpec {
  instanceId: string;
  image: string;
  cpuLimit: string;
  memoryLimitMb: number;
  exposedPorts: number[];
  network: string; // rede isolada dedicada
  timeoutMin: number;
  osType?: 'WINDOWS10' | 'UBUNTU_DESKTOP' | 'UBUNTU_DESKTOP_RDP' | null; // usado só pelo driver de VM
  vmVersion?: string | null;
}

export interface LabProvisionResult {
  externalRef: string; // id do container/pod/vm
  accessUrl: string | null;
  networkId: string;
  vncPort?: number; // presente só em modo direct-port
  rdpPort?: number; // só Windows/direct-port
  guacConnectionId?: string; // id da conexão RDP criada no Guacamole (osType *_RDP)
}

export interface DestroyMeta {
  guacConnectionId?: string | null; // conexão Guacamole associada (osType *_RDP) — ver VmLabDriver
}

export interface ILabDriver {
  readonly name: string;
  provision(spec: LabProvisionSpec): Promise<LabProvisionResult>;
  destroy(externalRef: string, meta?: DestroyMeta): Promise<void>;
}
