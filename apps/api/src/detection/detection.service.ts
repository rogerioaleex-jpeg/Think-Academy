import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class DetectionService {
  constructor(private prisma: PrismaService, private gamification: GamificationService) {}

  /** Lista os desafios (com logs, sem a regra de referência). */
  listChallenges() {
    return this.prisma.detectionChallenge.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, description: true, base: true, mitre: true, logs: true, passScore: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const c = await this.prisma.detectionChallenge.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, base: true, mitre: true, logs: true, passScore: true },
    });
    if (!c) throw new NotFoundException('Desafio não encontrado.');
    return c;
  }

  /**
   * Avaliador heurístico de KQL: compara os logs sintéticos (cada evento tem
   * `malicious`) com a regra submetida. A precisão/recall vêm da presença dos
   * tokens exigidos (recall) e dos tokens de precisão (reduzem falso-positivo).
   * Não é um motor KQL real — é determinístico e pedagógico.
   */
  async submit(userId: string, challengeId: string, kql: string) {
    const c = await this.prisma.detectionChallenge.findUnique({ where: { id: challengeId } });
    if (!c) throw new NotFoundException('Desafio não encontrado.');

    const logs = (c.logs as any[]) ?? [];
    const positives = logs.filter((l) => l.malicious).length;
    const negatives = logs.length - positives;
    const q = kql.toLowerCase();

    const hasCore = (c.requiredTokens ?? []).every((t) => q.includes(t.toLowerCase()));
    const hasPrecision = (c.precisionTokens ?? []).length === 0
      ? true
      : (c.precisionTokens ?? []).some((t) => q.includes(t.toLowerCase()));

    const truePositives = hasCore ? positives : Math.floor(positives * 0.5);
    const falsePositives = hasPrecision ? Math.floor(negatives * 0.1) : negatives;
    const eventsMatched = truePositives + falsePositives;

    const precision = truePositives / (truePositives + falsePositives || 1);
    const recall = truePositives / (positives || 1);
    const f1 = (2 * precision * recall) / (precision + recall || 1);
    const score = Math.round((f1 || 0) * 100);
    const passed = score >= c.passScore;

    await this.prisma.detectionSubmission.create({
      data: { challengeId, userId, kql, eventsMatched, truePositives, falsePositives, score },
    });
    if (passed) {
      await this.gamification.awardXp(userId, 'CHALLENGE', `detection:${challengeId}`, 150, `Detection Eng.: ${c.title}`);
    }

    return { eventsMatched, truePositives, falsePositives, score, passScore: c.passScore, passed, mitre: c.mitre };
  }
}
