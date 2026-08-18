import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Visão geral para o gestor: números do time e principais gaps. */
  async managerOverview() {
    const [analysts, coursesCompleted, labInstances, examAgg] = await Promise.all([
      this.prisma.user.count({ where: { roles: { some: { role: { name: RoleName.ANALYST } } } } }),
      this.prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.labInstance.count(),
      this.prisma.examAttempt.aggregate({ where: { status: 'GRADED' }, _avg: { scorePct: true }, _count: true }),
    ]);

    // Gaps do time: média de scorePct por competência (menores primeiro).
    const comps = await this.prisma.competency.findMany({
      include: { users: { select: { scorePct: true } } },
    });
    const gaps = comps
      .map((c) => {
        const scores = c.users.map((u) => u.scorePct ?? 0);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        return { key: c.key, name: c.name, avgScorePct: avg, assessed: scores.length };
      })
      .sort((a, b) => a.avgScorePct - b.avgScorePct);

    return {
      team: { analysts, coursesCompleted, labs: labInstances },
      exams: { graded: examAgg._count, avgScorePct: Math.round(examAgg._avg.scorePct ?? 0) },
      gaps,
    };
  }

  /**
   * ROI & custos (executivo). Os valores financeiros são demonstrativos —
   * em produção viriam de integrações de RH/financeiro. Os contadores de
   * atividade são reais (base do denominador de custo por skill).
   */
  async roiOverview() {
    const [activeLearners, skillsGained] = await Promise.all([
      this.prisma.user.count({ where: { roles: { some: { role: { name: RoleName.ANALYST } } } } }),
      this.prisma.userCompetency.count({ where: { level: { not: 'NONE' } } }),
    ]);
    return {
      kpis: {
        costPerSkill: 1245, costPerSkillDeltaPct: -12.4,
        externalHiringSavings: 485000, externalHiringSavingsDeltaPct: 8.2,
        retentionImprovementPct: 94.2, retentionDeltaPct: 4.1,
        overallRoiPct: 312, status: 'On Track',
      },
      basis: { activeLearners, skillsGained },
      trend: [
        { month: 'Jan', spend: 10, value: 6 }, { month: 'Fev', spend: 14, value: 9 },
        { month: 'Mar', spend: 18, value: 15 }, { month: 'Abr', spend: 22, value: 17 },
        { month: 'Mai', spend: 30, value: 26 }, { month: 'Jun', spend: 38, value: 34 },
      ],
      budget: [
        { dept: 'SOC Operations', pct: 85, detail: '$120k / $140k' },
        { dept: 'Threat Intel', pct: 92, detail: '$85k / $92k' },
        { dept: 'Incident Response', pct: 105, detail: '$110k / $105k', over: true },
        { dept: 'Red Team', pct: 60, detail: '$45k / $75k' },
      ],
    };
  }

  /** Gestão de talentos (executivo): contadores reais + matriz de skill. */
  async talentOverview() {
    const analysts = await this.prisma.user.findMany({
      where: { roles: { some: { role: { name: RoleName.ANALYST } } } },
      select: { id: true, name: true, competencies: { include: { competency: true } } },
      orderBy: { name: 'asc' },
    });
    const catalog = await this.prisma.competency.findMany({ orderBy: { name: 'asc' } });

    const allScores = analysts.flatMap((a) => a.competencies.map((c) => c.scorePct ?? 0));
    const avg = allScores.length ? Math.round(allScores.reduce((x, y) => x + y, 0) / allScores.length) : 0;
    const avgLevel = avg >= 85 ? 'L5' : avg >= 65 ? 'L4' : avg >= 45 ? 'L3' : avg >= 20 ? 'L2' : 'L1';
    const criticalGaps = catalog.filter((c) => {
      const s = analysts.flatMap((a) => a.competencies.filter((uc) => uc.competencyId === c.id).map((uc) => uc.scorePct ?? 0));
      const m = s.length ? s.reduce((x, y) => x + y, 0) / s.length : 0;
      return m < 45;
    }).length;

    return {
      kpis: { activeLearners: analysts.length, avgLevel, criticalGaps },
      competencies: catalog.map((c) => ({ key: c.key, name: c.name })),
      matrix: analysts.map((a) => ({
        name: a.name,
        levels: Object.fromEntries(a.competencies.map((uc) => [uc.competency.key, uc.scorePct ?? 0])),
      })),
    };
  }

  /** Perfil técnico detalhado de um analista (visão do gestor). */
  async analystProfile(userId: string) {
    const [user, comps, badges, certs, examCount, labCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, jobTitle: true, level: true, totalXp: true, lastLoginAt: true },
      }),
      this.prisma.userCompetency.findMany({ where: { userId }, include: { competency: true } }),
      this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
      this.prisma.certificate.findMany({ where: { userId, revoked: false }, select: { title: true, publicId: true, issuedAt: true } }),
      this.prisma.examAttempt.count({ where: { userId, status: 'GRADED' } }),
      this.prisma.labInstance.count({ where: { userId } }),
    ]);
    if (!user) throw new NotFoundException('Analista não encontrado.');
    return {
      user,
      competencies: comps.map((c) => ({ key: c.competency.key, name: c.competency.name, level: c.level, scorePct: c.scorePct ?? 0, evidence: c.evidence })),
      badges: badges.map((b) => ({ name: b.badge.name, slug: b.badge.slug })),
      certificates: certs,
      activity: { exams: examCount, labs: labCount },
    };
  }

  /** Relatório executivo de talentos (para exportação). */
  async talentReport() {
    const [overview, manager] = await Promise.all([this.talentOverview(), this.managerOverview()]);
    return {
      generatedFor: 'SOC',
      kpis: overview.kpis,
      matrix: overview.matrix,
      competencies: overview.competencies,
      gaps: manager.gaps,
      recommendations: manager.gaps.slice(0, 3).map((g) => ({
        competency: g.name,
        priority: g.avgScorePct < 45 ? 'CRÍTICA' : g.avgScorePct < 65 ? 'ALTA' : 'MÉDIA',
        action: `Atribuir trilha de ${g.name} aos analistas abaixo de 65%.`,
      })),
    };
  }

  /** Feed operacional do SOC Simulator (demonstrativo). */
  socLive() {
    return {
      tiles: { open: 2, investigating: 1, escalated: 1, closedToday: 11, mttrMin: 8 },
      feed: [
        { time: '02:41:07', id: '2026-000185', sev: 'High', alert: 'Brute Force — 4625 x47', asset: 'jsilva', status: 'Em investigação', analyst: 'A. Chen' },
        { time: '09:13:22', id: '2026-000184', sev: 'Medium', alert: 'Impossible Travel', asset: 'usuario@empresa.com', status: 'Novo', analyst: '—' },
        { time: '14:22:59', id: '2026-000186', sev: 'Low', alert: 'PowerShell Base64', asset: 'host-fin-07', status: 'Escalado', analyst: 'D. Kim' },
        { time: '15:04:11', id: '2026-000187', sev: 'High', alert: 'Ransomware note detectada', asset: 'fileserver-02', status: 'Novo', analyst: '—' },
      ],
    };
  }
}
