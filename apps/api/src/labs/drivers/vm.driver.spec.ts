const mockRun = jest.fn();

// `vm.driver.ts` faz `const run = promisify(exec)` no topo do módulo — mockar
// `util.promisify` para sempre devolver `mockRun` deixa o teste independente
// de como o child_process real se comporta, e o mock roteia por conteúdo do
// comando (mais robusto que depender da ordem exata das chamadas).
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockRun,
}));
jest.mock('child_process', () => ({ exec: jest.fn() }));

import { VmLabDriver } from './vm.driver';
import { LabProvisionSpec } from './lab-driver.interface';

function baseSpec(overrides: Partial<LabProvisionSpec> = {}): LabProvisionSpec {
  return {
    instanceId: 'inst-1',
    image: '',
    cpuLimit: '4',
    memoryLimitMb: 8192,
    exposedPorts: [],
    network: 'tica-labs-isolated',
    timeoutMin: 120,
    osType: 'UBUNTU_DESKTOP',
    vmVersion: null,
    ...overrides,
  };
}

describe('VmLabDriver', () => {
  let driver: VmLabDriver;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    mockRun.mockReset();
    driver = new VmLabDriver();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function mockDocker({ dockerOk, kvmOk }: { dockerOk: boolean; kvmOk: boolean }) {
    mockRun.mockImplementation((cmd: string) => {
      if (cmd.startsWith('docker version')) {
        return dockerOk ? Promise.resolve({ stdout: '24.0.0' }) : Promise.reject(new Error('sem docker'));
      }
      // Checagem de KVM (comando específico de teste) — NÃO confundir com o
      // `docker run -d ... --device=/dev/kvm ...` real de provisionamento,
      // que também contém essa substring.
      if (cmd.includes('alpine test -e /dev/kvm')) {
        return kvmOk ? Promise.resolve({ stdout: '' }) : Promise.reject(new Error('sem kvm'));
      }
      if (cmd.startsWith('docker network inspect')) {
        return Promise.resolve({ stdout: 'existe' });
      }
      if (cmd.startsWith('docker run -d')) {
        return Promise.resolve({ stdout: 'abc123containerid' });
      }
      if (cmd.startsWith('docker port')) {
        return Promise.resolve({ stdout: '0.0.0.0:54321' });
      }
      return Promise.resolve({ stdout: '' });
    });
  }

  it('sem Docker disponível: cai em modo simulação, mesmo para Ubuntu (sem KVM)', async () => {
    mockDocker({ dockerOk: false, kvmOk: false });
    const result = await driver.provision(baseSpec({ osType: 'UBUNTU_DESKTOP' }));
    expect(result.externalRef).toBe('sim-inst-1');
    expect(result.accessUrl).toBeNull();
  });

  it('Windows sem KVM: cai em modo simulação mesmo com Docker disponível', async () => {
    mockDocker({ dockerOk: true, kvmOk: false });
    const result = await driver.provision(baseSpec({ osType: 'WINDOWS10', vmVersion: '10' }));
    expect(result.externalRef).toBe('sim-inst-1');
    expect(result.accessUrl).toBeNull();
  });

  it('Ubuntu sem KVM: provisiona normalmente (Ubuntu não precisa de KVM)', async () => {
    // direct-port é o modo dev-only (rede NÃO internal) — validado ao vivo
    // que ele não funciona contra a rede isolada real; ver comentário em
    // isNetworkInternal() no driver. Testado aqui explicitamente porque não
    // é mais o modo padrão.
    process.env.LAB_VM_ACCESS_MODE = 'direct-port';
    mockDocker({ dockerOk: true, kvmOk: false });
    const result = await driver.provision(baseSpec({ osType: 'UBUNTU_DESKTOP' }));
    expect(result.externalRef).toBe('abc123containerid');
    expect(result.accessUrl).toBe('http://localhost:54321/');
    expect(result.vncPort).toBe(54321);
  });

  it('Windows com KVM disponível: provisiona normalmente e publica RDP e VNC (direct-port)', async () => {
    process.env.LAB_VM_ACCESS_MODE = 'direct-port';
    mockDocker({ dockerOk: true, kvmOk: true });
    const result = await driver.provision(baseSpec({ osType: 'WINDOWS10', vmVersion: '10' }));
    expect(result.externalRef).toBe('abc123containerid');
    expect(result.vncPort).toBe(54321);
    expect(result.rdpPort).toBe(54321); // mock retorna a mesma porta pra qualquer `docker port`
  });

  it('sem LAB_VM_ACCESS_MODE definido, usa traefik-labels por padrão (único modo que funciona com a rede isolada)', async () => {
    delete process.env.LAB_VM_ACCESS_MODE;
    process.env.LAB_PUBLIC_DOMAIN = 'labs.example.com';
    mockDocker({ dockerOk: true, kvmOk: false });
    const result = await driver.provision(baseSpec({ osType: 'UBUNTU_DESKTOP' }));
    expect(result.externalRef).toBe('abc123containerid');
    expect(result.accessUrl).toBe('https://lab-inst-1.labs.example.com/');
    expect(result.vncPort).toBeUndefined();
    // Nenhuma chamada a `docker port` deveria ocorrer no modo traefik-labels.
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('docker port'));

    // Validado em produção: sem shQuote() no label da regra do Traefik,
    // `/bin/sh -c "<cmd>"` falhava com `Syntax error: "(" unexpected` por
    // causa do backtick/parênteses de `Host(\`...\`)`. O label precisa
    // estar entre aspas simples no comando final.
    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).toContain(
      "--label 'traefik.http.routers.lab-inst-1.rule=Host(`lab-inst-1.labs.example.com`)'",
    );
  });

  it('destroy: ignora refs de simulação sem chamar o Docker', async () => {
    mockDocker({ dockerOk: true, kvmOk: true });
    await driver.destroy('sim-inst-1');
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('docker rm'));
  });

  it('destroy: remove o container e o volume nomeado da instância', async () => {
    mockRun.mockImplementation((cmd: string) => {
      if (cmd.startsWith('docker version')) return Promise.resolve({ stdout: '24.0.0' });
      if (cmd.startsWith('docker inspect')) return Promise.resolve({ stdout: '/tica-vm-inst-1\n' });
      if (cmd.startsWith('docker rm') || cmd.startsWith('docker volume rm')) return Promise.resolve({ stdout: '' });
      return Promise.resolve({ stdout: '' });
    });
    await driver.destroy('abc123containerid');
    expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('docker rm -f abc123containerid'));
    expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('docker volume rm -f tica-vm-vol-inst-1'));
  });
});
