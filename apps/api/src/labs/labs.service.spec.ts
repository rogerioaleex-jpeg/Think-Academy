import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { LabsService } from './labs.service';

/** Mock mínimo do PrismaService com os métodos que o LabsService usa. */
function makePrismaMock() {
  return {
    lab: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    labInstance: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    labChallenge: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    labHint: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    labSubmission: { create: jest.fn() },
  } as any;
}

function makeDriverRegistryMock() {
  return { resolve: jest.fn() } as any;
}

describe('LabsService', () => {
  let prisma: any;
  let gamification: any;
  let drivers: any;
  let guacamole: any;
  let service: LabsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    gamification = { awardXp: jest.fn() };
    drivers = makeDriverRegistryMock();
    guacamole = { buildClientUrl: jest.fn().mockResolvedValue('https://guac.example.com/#/client/x?token=y') };
    service = new LabsService(prisma, gamification, drivers, guacamole);
  });

  describe('createLab', () => {
    it('usa defaults de container CTF quando driver é DOCKER (ou omitido)', async () => {
      prisma.lab.create.mockResolvedValue({});
      await service.createLab({ title: 'Lab X', slug: 'lab-x', category: 'CTF' as any });

      const data = prisma.lab.create.mock.calls[0][0].data;
      expect(data.driver).toBe('DOCKER');
      expect(data.osType).toBeNull();
      expect(data.cpuLimit).toBe('1');
      expect(data.memoryLimitMb).toBe(1024);
      expect(data.timeoutMin).toBe(60);
    });

    it('aplica defaults maiores de cpu/memória/prazo quando driver é VM', async () => {
      prisma.lab.create.mockResolvedValue({});
      await service.createLab({
        title: 'Windows 10 Desktop', slug: 'windows-10-desktop', category: 'WINDOWS' as any,
        driver: 'VM' as any, osType: 'WINDOWS10' as any, vmVersion: '10',
      });

      const data = prisma.lab.create.mock.calls[0][0].data;
      expect(data.driver).toBe('VM');
      expect(data.osType).toBe('WINDOWS10');
      expect(data.vmVersion).toBe('10');
      expect(data.cpuLimit).toBe('4');
      expect(data.memoryLimitMb).toBe(8192);
      expect(data.timeoutMin).toBe(120);
    });

    it('ignora osType/vmVersion quando driver não é VM', async () => {
      prisma.lab.create.mockResolvedValue({});
      await service.createLab({
        title: 'Lab X', slug: 'lab-x', category: 'CTF' as any,
        osType: 'UBUNTU_DESKTOP' as any, vmVersion: '10',
      });

      const data = prisma.lab.create.mock.calls[0][0].data;
      expect(data.osType).toBeNull();
      expect(data.vmVersion).toBeNull();
    });
  });

  describe('getInstance', () => {
    it('retorna a instância quando pertence ao usuário', async () => {
      const instance = { id: 'i1', userId: 'u1', lab: { challenges: [], hints: [] }, submissions: [] };
      prisma.labInstance.findUnique.mockResolvedValue(instance);

      const result = await service.getInstance('u1', 'i1');
      expect(result).toBe(instance);
    });

    it('lança ForbiddenException para instância de outro usuário', async () => {
      prisma.labInstance.findUnique.mockResolvedValue({ id: 'i1', userId: 'outro-usuario' });
      await expect(service.getInstance('u1', 'i1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getRdpAccessUrl', () => {
    it('gera a URL com token fresco quando a instância tem guacConnectionId', async () => {
      prisma.labInstance.findUnique.mockResolvedValue({ id: 'i1', userId: 'u1', guacConnectionId: 'guac-conn-1' });
      const result = await service.getRdpAccessUrl('u1', 'i1');
      expect(guacamole.buildClientUrl).toHaveBeenCalledWith('guac-conn-1');
      expect(result.url).toBe('https://guac.example.com/#/client/x?token=y');
    });

    it('lança BadRequestException quando ainda não há guacConnectionId', async () => {
      prisma.labInstance.findUnique.mockResolvedValue({ id: 'i1', userId: 'u1', guacConnectionId: null });
      await expect(service.getRdpAccessUrl('u1', 'i1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('start', () => {
    it('resolve o driver certo a partir de Lab.driver e persiste osType/vncPort/rdpPort', async () => {
      const lab = {
        id: 'lab1', driver: 'VM', osType: 'UBUNTU_DESKTOP', vmVersion: null,
        dockerImage: null, cpuLimit: '4', memoryLimitMb: 8192, exposedPorts: [], timeoutMin: 120,
      };
      prisma.lab.findUnique.mockResolvedValue(lab);
      prisma.labInstance.findFirst.mockResolvedValue(null);
      prisma.labInstance.create.mockResolvedValue({ id: 'inst1' });
      prisma.labInstance.update.mockResolvedValue({ id: 'inst1', status: 'RUNNING' });

      const vmDriver = { provision: jest.fn().mockResolvedValue({
        externalRef: 'abc123', accessUrl: 'http://localhost:1234/', networkId: 'tica-labs-isolated', vncPort: 1234,
      }) };
      drivers.resolve.mockReturnValue(vmDriver);

      await service.start('u1', 'lab1');

      expect(drivers.resolve).toHaveBeenCalledWith('VM');
      expect(vmDriver.provision).toHaveBeenCalledWith(expect.objectContaining({ osType: 'UBUNTU_DESKTOP' }));
      const updateData = prisma.labInstance.update.mock.calls[0][0].data;
      expect(updateData.osType).toBe('UBUNTU_DESKTOP');
      expect(updateData.vncPort).toBe(1234);
    });
  });
});
