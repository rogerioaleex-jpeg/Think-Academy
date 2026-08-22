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
  let guacamole: { createRdpConnection: jest.Mock; deleteConnection: jest.Mock };
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    mockRun.mockReset();
    guacamole = {
      createRdpConnection: jest.fn().mockResolvedValue('guac-conn-1'),
      deleteConnection: jest.fn().mockResolvedValue(undefined),
    };
    driver = new VmLabDriver(guacamole as any);
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
      if (cmd.startsWith('docker inspect')) {
        return Promise.resolve({ stdout: '172.18.0.5' }); // IP interno usado por containerIp()
      }
      if (cmd.startsWith('docker exec')) {
        return Promise.resolve({ stdout: '' }); // ex.: chpasswd
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

  it('Windows: sem WINDOWS_GOLDEN_IMAGE_PATH nem WINDOWS_ISO_CACHE_PATH, não tenta semear o volume (cairá pra download, que falha na rede isolada)', async () => {
    delete process.env.WINDOWS_GOLDEN_IMAGE_PATH;
    delete process.env.WINDOWS_ISO_CACHE_PATH;
    mockDocker({ dockerOk: true, kvmOk: true });
    await driver.provision(baseSpec({ osType: 'WINDOWS10', vmVersion: '10' }));
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('custom.iso'));
  });

  it('Windows: com WINDOWS_ISO_CACHE_PATH definido (sem golden), copia a ISO em cache pro volume ANTES de iniciar o container', async () => {
    delete process.env.WINDOWS_GOLDEN_IMAGE_PATH;
    process.env.WINDOWS_ISO_CACHE_PATH = '/opt/tica-labs/iso-cache/win10.iso';
    mockDocker({ dockerOk: true, kvmOk: true });
    await driver.provision(baseSpec({ osType: 'WINDOWS10', vmVersion: '10' }));

    const seedCallIdx = mockRun.mock.calls.findIndex((c) => String(c[0]).includes('cp /src/custom.iso /dst/custom.iso'));
    const runCallIdx = mockRun.mock.calls.findIndex((c) => String(c[0]).startsWith('docker run -d'));
    expect(seedCallIdx).toBeGreaterThanOrEqual(0);
    expect(runCallIdx).toBeGreaterThan(seedCallIdx); // a cópia da ISO precisa terminar ANTES do container real subir

    const seedCmd = String(mockRun.mock.calls[seedCallIdx][0]);
    expect(seedCmd).toContain('--network none'); // não precisa (nem deve) tocar a rede isolada
    expect(seedCmd).toContain('/opt/tica-labs/iso-cache/win10.iso:/src/custom.iso:ro');
    expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('docker volume create tica-vm-vol-inst-1'));
  });

  it('Windows: com WINDOWS_GOLDEN_IMAGE_PATH definido, clona o storage já instalado (pula download E instalação)', async () => {
    process.env.WINDOWS_GOLDEN_IMAGE_PATH = '/opt/tica-labs/golden-win10';
    process.env.WINDOWS_ISO_CACHE_PATH = '/opt/tica-labs/iso-cache/win10.iso'; // golden tem prioridade
    mockDocker({ dockerOk: true, kvmOk: true });
    await driver.provision(baseSpec({ osType: 'WINDOWS10', vmVersion: '10' }));

    const seedCallIdx = mockRun.mock.calls.findIndex((c) => String(c[0]).includes('cp -a /src/. /dst/'));
    const runCallIdx = mockRun.mock.calls.findIndex((c) => String(c[0]).startsWith('docker run -d'));
    expect(seedCallIdx).toBeGreaterThanOrEqual(0);
    expect(runCallIdx).toBeGreaterThan(seedCallIdx);

    const seedCmd = String(mockRun.mock.calls[seedCallIdx][0]);
    expect(seedCmd).toContain('--network none');
    expect(seedCmd).toContain('/opt/tica-labs/golden-win10:/src:ro');
    // Modo golden não deve tocar o caminho da ISO solta.
    expect(mockRun).not.toHaveBeenCalledWith(expect.stringContaining('cp /src/custom.iso /dst/custom.iso'));
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

  it('UBUNTU_DESKTOP_RDP: cria a conexão no Guacamole e não usa Traefik/accessUrl direto', async () => {
    mockDocker({ dockerOk: true, kvmOk: false });
    const result = await driver.provision(baseSpec({ osType: 'UBUNTU_DESKTOP_RDP' }));
    expect(result.externalRef).toBe('abc123containerid');
    expect(result.accessUrl).toBeNull(); // URL de verdade é gerada sob demanda (token fresco) — ver GuacamoleClient
    expect(result.guacConnectionId).toBe('guac-conn-1');
    expect(guacamole.createRdpConnection).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: '172.18.0.5', port: 3389, username: 'root' }),
    );
    // Nenhum label de Traefik deveria ter sido usado para RDP (não é HTTP).
    const runCall = mockRun.mock.calls.find((c) => String(c[0]).startsWith('docker run -d'));
    expect(runCall?.[0]).not.toContain('traefik.enable');
  });

  it('destroy: remove a conexão do Guacamole quando guacConnectionId é informado', async () => {
    mockDocker({ dockerOk: true, kvmOk: true });
    await driver.destroy('abc123containerid', { guacConnectionId: 'guac-conn-1' });
    expect(guacamole.deleteConnection).toHaveBeenCalledWith('guac-conn-1');
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
