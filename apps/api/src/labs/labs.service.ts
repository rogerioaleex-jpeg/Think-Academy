import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { DockerLabDriver } from './drivers/docker.driver';

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);
  private readonly network = process.env.LAB_NETWORK ?? 'tica-labs-isolated';

  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private docker: DockerLabDriver,
  ) {}

  // ---------------------------------------------------------------- Admin
  createLab(data: {
    title: string; slug: string; category: any; objective?: string; difficulty?: any;
    durationMin?: number; xpReward?: number; dockerImage?: string; cpuLimit?: string;
    memoryLimitMb?: number; timeoutMin?: number; exposedPorts?: number[];
  }) {
    return this.prisma.lab.create({
      data: {
        title: data.title, slug: data.slug, category: data.category, objective: data.objective,
        difficulty: data.difficulty ?? 'MEDIUM', durationMin: data.durationMin ?? 30,
        xpReward: data.xpReward ?? 100, driver: 'DOCKER', dockerImage: data.dockerImage,
        cpuLimit: data.cpuLimit ?? '1', memoryLimitMb: data.memoryLimitMb ?? 1024,
        timeoutMin: data.timeoutMin ?? 60, exposedPorts: data.exposedPorts ?? [], status: 'PUBLISHED',
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
      const result = await this.docker.provision({
        instanceId: instance.id,
        image: lab.dockerImage ?? 'tica/lab-placeholder:latest',
        cpuLimit: lab.cpuLimit,
        memoryLimitMb: lab.memoryLimitMb,
        exposedPorts: lab.exposedPorts,
        network: this.network,
        timeoutMin: lab.timeoutMin,
      });
      return this.prisma.labInstance.update({
        where: { id: instance.id },
        data: { status: 'RUNNING', externalRef: result.externalRef, accessUrl: result.accessUrl, networkId: result.networkId },
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
    if (instance.externalRef) await this.docker.destroy(instance.externalRef);
    return this.prisma.labInstance.update({
      where: { id: instanceId },
      data: { status: 'DESTROYED', stoppedAt: new Date() },
    });
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
      if (inst.externalRef) await this.docker.destroy(inst.externalRef);
      await this.prisma.labInstance.update({
        where: { id: inst.id },
        data: { status: 'EXPIRED', stoppedAt: new Date() },
      });
    }
    return { cleaned: expired.length };
  }
}
