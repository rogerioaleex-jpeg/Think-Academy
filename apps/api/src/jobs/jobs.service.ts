import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LabsService } from '../labs/labs.service';
import { CertificatesService } from '../certificates/certificates.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tarefas assíncronas agendadas. Ver docs/04-main-flows.md.
 * Em produção com múltiplas réplicas, proteja os jobs com um lock distribuído
 * (ex.: Redis) para que apenas uma instância execute cada ciclo.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private labs: LabsService,
    private certificates: CertificatesService,
    private prisma: PrismaService,
  ) {}

  /** A cada minuto: destrói instâncias de lab expiradas. */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupLabs() {
    const { cleaned } = await this.labs.cleanupExpired();
    if (cleaned > 0) this.logger.log(`Labs expirados destruídos: ${cleaned}`);
  }

  /**
   * A cada 10 minutos: emite certificados para trilhas concluídas que ainda
   * não têm certificado. Rede de segurança caso a emissão inline falhe.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async issuePendingCertificates() {
    const completed = await this.prisma.userLearningPath.findMany({
      where: { status: 'COMPLETED' },
      select: { userId: true, learningPathId: true },
    });
    let issued = 0;
    for (const c of completed) {
      const exists = await this.prisma.certificate.findFirst({
        where: { userId: c.userId, learningPathId: c.learningPathId },
      });
      if (!exists) {
        await this.certificates.issue(c.userId, c.learningPathId);
        issued++;
      }
    }
    if (issued > 0) this.logger.log(`Certificados emitidos: ${issued}`);
  }

  /** Toda hora: recomputa o snapshot do ranking global. */
  @Cron(CronExpression.EVERY_HOUR)
  async recomputeLeaderboard() {
    const users = await this.prisma.user.findMany({
      orderBy: { totalXp: 'desc' },
      select: { id: true, totalXp: true },
    });
    let rank = 1;
    for (const u of users) {
      await this.prisma.leaderboardEntry.upsert({
        where: { scope_period_userId: { scope: 'GLOBAL', period: 'GLOBAL', userId: u.id } },
        update: { xp: u.totalXp, rank },
        create: { scope: 'GLOBAL', period: 'GLOBAL', userId: u.id, xp: u.totalXp, rank },
      });
      rank++;
    }
  }

  /**
   * Diariamente: remove refresh tokens já expirados ou revogados há mais de
   * 7 dias. Mantém a tabela `refresh_tokens` enxuta sem apagar revogações
   * recentes (úteis para auditoria/investigação de incidentes).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneRefreshTokens() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: cutoff } }],
      },
    });
    if (count > 0) this.logger.log(`Refresh tokens expirados/revogados removidos: ${count}`);
  }
}
