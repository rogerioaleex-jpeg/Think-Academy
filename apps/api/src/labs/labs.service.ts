import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { LabDriver } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { LabDriverRegistry } from './drivers/lab-driver.registry';

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

/** Imagem padrão quando o admin não informa uma explicitamente. */
const DEFAULT_IMAGE_FOR: Record<LabDriver, string> = {
  DOCKER: 'tica/lab-placeholder:latest',
  VM: '', // resolvido pelo próprio VmLabDriver a partir de osType
  KUBERNETES: '',
};

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);
  private readonly network = process.env.LAB_NETWORK ?? 'tica-labs-isolated';

  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private drivers: LabDriverRegistry,
  ) {}

  // ---------------------------------------------------------------- Admin
  createLab(data: {
    title: string; slug: string; category: any; objective?: string; difficulty?: any;
    durationMin?: number; xpReward?: number; driver?: LabDriver; osType?: any; vmVersion?: string;
    dockerImage?: string; cpuLimit?: string; memoryLimitMb?: number; timeoutMin?: number; exposedPorts?: number[];
  }) {
    const driver = data.driver ?? 'DOCKER';
    const isVm = driver === 'VM';
    return this.prisma.lab.create({
      data: {
        title: data.title, slug: data.slug, category: data.category, objective: data.objective,
        difficulty: data.difficulty ?? 'MEDIUM', durationMin: data.durationMin ?? 30,
        xpReward: data.xpReward ?? 100, driver, dockerImage: data.dockerImage,
        osType: isVm ? data.osType : null, vmVersion: isVm ? data.vmVersion : null,
        // VM completa exige recursos e prazo bem maiores que um container CTF.
        cpuLimit: data.cpuLimit ?? (isVm ? '4' : '1'),
        memoryLimitMb: data.memoryLimitMb ?? (isVm ? 8192 : 1024),
        timeoutMin: data.timeoutMin ?? (isVm ? 120 : 60),
        exposedPorts: data.exposedPorts ?? [], status: 'PUBLISHED',
      },
    });
  }

  /** A flag em texto NÃO é persistida — guardamos apenas o hash. */
  async addChallenge(labId: string, data: { title: string; description?: string; points?: number; flag: string }) {
    const order = await this.prisma.labChallenge.count({ where: { labId } });
    return this.prisma.labChallenge.create({
      data: {
        labId, title: data.title, description: data.description,
        points: data.points ?? 50, flagHash: sha256(data.flag), order,
      },
      select: { id: true, title: true, points: true, order: true },
    });
  }

  async addHint(labId: string, data: { text: string; costXp?: number }) {
    const order = await this.prisma.labHint.count({ where: { labId } });
    return this.prisma.labHint.create({
      data: { labId, text: data.text, costXp: data.costXp ?? 10, order },
    });
  }

  adminList() {
    return this.prisma.lab.findMany({
      include: { _count: { select: { challenges: true, hints: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  list() {
    return this.prisma.lab.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, title: true, slug: true, category: true, difficulty: true,
        durationMin: true, xpReward: true, objective: true,
        _count: { select: { challenges: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async get(slug: string) {
    const lab = await this.prisma.lab.findUnique({
      where: { slug },
      include: {
        challenges: { orderBy: { order: 'asc' }, select: { id: true, title: true, description: true, points: true, order: true } },
        hints: { orderBy: { order: 'asc' }, select: { id: true, order: true, costXp: true } }, // texto do hint só ao revelar
      },
    });
    if (!lab) throw new NotFoundException('Lab não encontrado.');
    return lab;
  }

  /** Inicia uma instância isolada. Reaproveita instância ativa, se houver. */
  async start(userId: string, labId: string) {
    const lab = await this.prisma.lab.findUnique({ where: { id: labId } });
    if (!lab) throw new NotFoundException('Lab não encontrado.');

    const existing = await this.prisma.labInstance.findFirst({
      where: { userId, labId, status: { in: ['PROVISIONING', 'RUNNING'] } },
    });
    if (existing) return existing;

    const instance = await this.prisma.labInstance.create({
      data: {
        labId, userId, status: 'PROVISIONING', driver: lab.driver,
        expiresAt: new Date(Date.now() + lab.timeoutMin * 60_000),
      },
    });

    try {
      const driver = this.drivers.resolve(lab.driver);
      const result = await driver.provision({
        instanceId: instance.id,
        image: lab.dockerImage ?? DEFAULT_IMAGE_FOR[lab.driver],
        cpuLimit: lab.cpuLimit,
        memoryLimitMb: lab.memoryLimitMb,
        exposedPorts: lab.exposedPorts,
        network: this.network,
        timeoutMin: lab.timeoutMin,
        osType: lab.osType,
        vmVersion: lab.vmVersion,
      });
      return this.prisma.labInstance.update({
        where: { id: instance.id },
        data: {
          status: 'RUNNING', externalRef: result.externalRef, accessUrl: result.accessUrl,
          networkId: result.networkId, osType: lab.osType, vncPort: result.vncPort, rdpPort: result.rdpPort,
        },
      });
    } catch (e) {
      this.logger.error(`Falha ao provisionar lab: ${(e as Error).message}`);
      await this.prisma.labInstance.update({ where: { id: instance.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('Não foi possível provisionar o ambiente.');
    }
  }

  async destroy(userId: string, instanceId: string) {
    const instance = await this.prisma.labInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Instância não encontrada.');
    if (instance.userId !== userId) throw new ForbiddenException();
    if (instance.externalRef) await this.drivers.resolve(instance.driver).destroy(instance.externalRef);
    return this.prisma.labInstance.update({
      where: { id: instanceId },
      data: { status: 'DESTROYED', stoppedAt: new Date() },
    });
  }

  /** Consulta o estado de uma instância (usado pelo console para polling). */
  async getInstance(userId: string, instanceId: string) {
    const instance = await this.prisma.labInstance.findUnique({
      where: { id: instanceId },
      include: {
        lab: {
          select: {
            id: true, title: true, slug: true, category: true, difficulty: true,
            objective: true, xpReward: true, driver: true,
            challenges: { orderBy: { order: 'asc' }, select: { id: true, title: true, description: true, points: true, order: true } },
            hints: { orderBy: { order: 'asc' }, select: { id: true, order: true, costXp: true } },
          },
        },
        submissions: { where: { correct: true }, select: { challengeId: true } },
      },
    });
    if (!instance) throw new NotFoundException('Instância não encontrada.');
    if (instance.userId !== userId) throw new ForbiddenException();
    return instance;
  }

  /** Reset = destrói e reprovisiona. */
  async reset(userId: string, instanceId: string) {
    const instance = await this.prisma.labInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Instância não encontrada.');
    if (instance.userId !== userId) throw new ForbiddenException();
    await this.destroy(userId, instanceId);
    return this.start(userId, instance.labId);
  }

  /** Revela um hint (custa XP, registrado como ajuste). */
  async revealHint(userId: string, hintId: string) {
    const hint = await this.prisma.labHint.findUnique({ where: { id: hintId } });
    if (!hint) throw new NotFoundException('Hint não encontrado.');
    if (hint.costXp > 0) {
      await this.gamification.awardXp(userId, 'MANUAL_ADJUSTMENT', `hint:${hintId}`, -hint.costXp, 'Uso de hint');
    }
    return { text: hint.text };
  }

  /**
   * Valida a resposta de um desafio (server-side, via hash — a flag nunca é
   * exposta). Ao acertar, credita XP de forma idempotente.
   */
  async submit(userId: string, instanceId: string, challengeId: string, answer: string) {
    const [instance, challenge] = await Promise.all([
      this.prisma.labInstance.findUnique({ where: { id: instanceId } }),
      this.prisma.labChallenge.findUnique({ where: { id: challengeId } }),
    ]);
    if (!instance || !challenge) throw new NotFoundException('Instância ou desafio inexistente.');
    if (instance.userId !== userId) throw new ForbiddenException();

    const correct = !!challenge.flagHash && challenge.flagHash === sha256(answer);
    await this.prisma.labSubmission.create({
      data: { instanceId, challengeId, userId, answer, correct },
    });

    if (correct) {
      await this.gamification.awardXp(userId, 'CHALLENGE', challengeId, challenge.points, `Desafio: ${challenge.title}`);
    }
    return { correct, points: correct ? challenge.points : 0 };
  }

  /**
   * Rotina de limpeza (chamada por job agendado): destrói instâncias expiradas.
   * Ver docs/04-main-flows.md — "Ciclo de vida do laboratório".
   */
  async cleanupExpired() {
    const expired = await this.prisma.labInstance.findMany({
      where: { status: { in: ['PROVISIONING', 'RUNNING'] }, expiresAt: { lt: new Date() } },
    });
    for (const inst of expired) {
      if (inst.externalRef) await this.drivers.resolve(inst.driver).destroy(inst.externalRef);
      await this.prisma.labInstance.update({
        where: { id: inst.id },
        data: { status: 'EXPIRED', stoppedAt: new Date() },
      });
    }
    return { cleaned: expired.length };
  }
}
