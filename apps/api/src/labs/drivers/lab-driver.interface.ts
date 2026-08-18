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
}

export interface LabProvisionResult {
  externalRef: string; // id do container/pod/vm
  accessUrl: string | null;
  networkId: string;
}

export interface ILabDriver {
  readonly name: string;
  provision(spec: LabProvisionSpec): Promise<LabProvisionResult>;
  destroy(externalRef: string): Promise<void>;
}
