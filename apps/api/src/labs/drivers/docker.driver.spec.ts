const mockRun = jest.fn();

// Mesmo padrão de mock usado em vm.driver.spec.ts — ver comentário lá.
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockRun,
}));
jest.mock('child_process', () => ({ exec: jest.fn() }));

import { DockerLabDriver } from './docker.driver';
import { LabProvisionSpec } from './lab-driver.interface';

function baseSpec(overrides: Partial<LabProvisionSpec> = {}): LabProvisionSpec {
  return {
    instanceId: 'inst-1',
    image: 'nginx:alpine',
    cpuLimit: '1',
    memoryLimitMb: 1024,
    exposedPorts: [80],
    network: 'tica-labs-isolated',
    timeoutMin: 60,
    ...overrides,
  };
}

describe('DockerLabDriver', () => {
  let driver: DockerLabDriver;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    mockRun.mockReset();
    driver = new DockerLabDriver();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function mockDocker({ dockerOk }: { dockerOk: boolean }) {
    mockRun.mockImplementation((cmd: string) => {
      if (cmd.startsWith('docker version')) {
        return dockerOk ? Promise.resolve({ stdout: '24.0.0' }) : Promise.reject(new Error('sem docker'));
      }
      if (cmd.startsWith('docker network inspect')) return Promise.resolve({ stdout: 'existe' });
      if (cmd.startsWith('docker run -d')) return Promise.resolve({ stdout: 'abc123containerid' });
      if (cmd.startsWith('docker port')) return Promise.resolve({ stdout: '0.0.0.0:54321' });
      return Promise.resolve({ stdout: '' });
    });
  }

  it('sem Docker disponível: cai em modo simulação', async () => {
    mockDocker({ dockerOk: false });
    const result = await driver.provision(baseSpec());
    expect(result.externalRef).toBe('sim-inst-1');
    expect(result.accessUrl).toBeNull();
  });

  it('BUG corrigido: sem LAB_VM_ACCESS_MODE definido, usa traefik-labels por padrão e retorna accessUrl real (antes era SEMPRE null)', async () => {
    delete process.env.LAB_VM_ACCESS_MODE;
    process.env.LAB_PUBLIC_DOMAIN = 'labs.example.com';
    mockDocker({ dockerOk: true });
    const result = await driver.provision(baseSpec());
    expect(result.externalRef).toBe('abc123containerid');
    expect(result.accessUrl).toBe('https://lab-inst-1.labs.example.com/');
    // Nenhuma chamada a `docker port` deveria ocorrer no modo traefik-labels.
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('docker port'));

    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).toContain(
      "--label 'traefik.http.routers.lab-inst-1.rule=Host(`lab-inst-1.labs.example.com`)'",
    );
    expect(runCall?.[0]).not.toContain('-p 0:80'); // internal:true não publica porta — não deve nem tentar
  });

  it('BUG corrigido: --read-only sozinho com só /tmp em tmpfs derrubava o nginx:alpine — precisa de /var/cache/nginx e /var/run também', async () => {
    mockDocker({ dockerOk: true });
    await driver.provision(baseSpec());
    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).toContain('--tmpfs /var/cache/nginx');
    expect(runCall?.[0]).toContain('--tmpfs /var/run');
  });

  it('BUG corrigido: --cap-drop ALL total quebrava o chown/setuid internos do nginx — precisa devolver CHOWN/SETUID/SETGID', async () => {
    mockDocker({ dockerOk: true });
    await driver.provision(baseSpec());
    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).toContain('--cap-drop ALL');
    expect(runCall?.[0]).toContain('--cap-add CHOWN');
    expect(runCall?.[0]).toContain('--cap-add SETUID');
    expect(runCall?.[0]).toContain('--cap-add SETGID');
  });

  it('direct-port: publica a porta e resolve o accessUrl via "docker port" (dev-only, sem garantia de isolamento)', async () => {
    process.env.LAB_VM_ACCESS_MODE = 'direct-port';
    mockDocker({ dockerOk: true });
    const result = await driver.provision(baseSpec());
    expect(result.accessUrl).toBe('http://localhost:54321/');

    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).toContain('-p 0:80');
    expect(runCall?.[0]).not.toContain('traefik.enable');
  });

  it('lab sem porta exposta: não gera labels de Traefik nem accessUrl', async () => {
    delete process.env.LAB_VM_ACCESS_MODE;
    mockDocker({ dockerOk: true });
    const result = await driver.provision(baseSpec({ exposedPorts: [] }));
    expect(result.accessUrl).toBeNull();
    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).not.toContain('traefik.enable');
  });

  it('destroy: ignora refs de simulação sem chamar o Docker', async () => {
    mockDocker({ dockerOk: true });
    await driver.destroy('sim-inst-1');
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('docker rm'));
  });

  it('destroy: remove o container', async () => {
    mockDocker({ dockerOk: true });
    await driver.destroy('abc123containerid');
    expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('docker rm -f abc123containerid'));
  });
});
