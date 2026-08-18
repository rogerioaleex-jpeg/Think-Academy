import { Injectable, Logger } from '@nestjs/common';
import { Prisma, XpSource, LeaderboardScope } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';

/** Tabela de XP por tipo de atividade (espelha o item 17 do PRD). */
export const XP_TABLE: Record<XpSource, number> = {
  LESSON: 10,
  QUIZ: 25,
  LAB: 100,
  CHALLENGE: 150,
  EXAM: 200,
  PATH_COMPLETION: 500,
  BADGE: 0,
  MANUAL_ADJUSTMENT: 0,
};

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  constructor(private prisma: PrismaService) {}

  /** Nível a partir do XP acumulado (curva simples e previsível). */
  static levelFor(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100)) + 1;
  }

  /**
   * Credita XP de forma idempotente. A constraint única (userId, source, refId)
   * garante que a MESMA atividade não pontue duas vezes (anti-farming).
   */
  async awardXp(userId: string, source: XpSource, refId: string | null, amount?: number, reason?: string) {
    const value = amount ?? XP_TABLE[source] ?? 0;
    try {
      await this.prisma.xpTransaction.create({
        data: { userId, source, refId, amount: value, reason },
      });
    } catch (e) {
      // P2002 = violação de unique → atividade já pontuada; ignora silenciosamente.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { awarded: 0, alreadyGranted: true };
      }
      throw e;
    }

    const agg = await this.prisma.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const totalXp = agg._sum.amount ?? 0;
    await this.prisma.user.update({
      where: { id: userId },
      data: { totalXp, level: GamificationService.levelFor(totalXp) },
    });

    await this.evaluateBadges(userId);
    return { awarded: value, totalXp };
  }

  /** Regras simples de conquista de badges. Extensível por configuração. */
  async evaluateBadges(userId: string) {
    const [completedCourses, labCount] = await Promise.all([
      this.prisma.enrollment.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.labInstance.count({ where: { userId } }),
    ]);

    const toGrant: string[] = [];
    if (completedCourses >= 1) toGrant.push('first-course');
    if (labCount >= 1) toGrant.push('first-lab');

    for (const slug of toGrant) {
      const badge = await this.prisma.badge.findUnique({ where: { slug } });
      if (!badge) continue;
      const already = await this.prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (!already) {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        this.logger.log(`Badge "${badge.name}" concedida a ${userId}`);
      }
    }
  }

  /** Ranking global (por XP acumulado) ou mensal (soma das transações do mês). */
  async leaderboard(scope: LeaderboardScope = LeaderboardScope.GLOBAL, limit = 20) {
    if (scope === LeaderboardScope.MONTHLY) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const rows = await this.prisma.xpTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: start } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });
      const users = await this.prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.userId) } },
        select: { id: true, name: true, level: true },
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: byId.get(r.userId)?.name ?? '—',
        level: byId.get(r.userId)?.level ?? 1,
        xp: r._sum.amount ?? 0,
      }));
    }

    const users = await this.prisma.user.findMany({
      orderBy: { totalXp: 'desc' },
      take: limit,
      select: { id: true, name: true, level: true, totalXp: true },
    });
    return users.map((u, i) => ({ rank: i + 1, userId: u.id, name: u.name, level: u.level, xp: u.totalXp }));
  }

  listBadges() {
    return this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
  }
}
