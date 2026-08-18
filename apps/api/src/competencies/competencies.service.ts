import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { AssessCompetencyDto } from './dto/competency.dto';

/**
 * Mapa competência → categorias de conteúdo recomendado.
 * Alimenta a geração automática de trilha recomendada (item 30 do PRD).
 */
const COMPETENCY_TO_CATEGORY: Record<string, string[]> = {
  SIEM: ['SOC', 'Microsoft Security'],
  KQL: ['Microsoft Security', 'Cloud'],
  NETWORKING: ['Fundamentos', 'SOC'],
  WINDOWS: ['SOC', 'Fundamentos'],
  LINUX: ['Fundamentos'],
  CLOUD: ['Cloud', 'Microsoft Security'],
  INCIDENT_RESPONSE: ['SOC'],
  THREAT_INTEL: ['SOC'],
  DFIR: ['SOC'],
};

const GAP_THRESHOLD = 65;

@Injectable()
export class CompetenciesService {
  constructor(private prisma: PrismaService) {}

  listCatalog() {
    return this.prisma.competency.findMany({ orderBy: { name: 'asc' } });
  }

  /** Perfil (radar) de um usuário. */
  async profile(userId: string) {
    const rows = await this.prisma.userCompetency.findMany({
      where: { userId },
      include: { competency: true },
    });
    return rows.map((r) => ({
      key: r.competency.key,
      name: r.competency.name,
      level: r.level,
      scorePct: r.scorePct ?? 0,
      evidence: r.evidence,
      assessedAt: r.assessedAt,
    }));
  }

  /** Matriz de competências da equipe (para gestores). */
  async teamMatrix() {
    const analysts = await this.prisma.user.findMany({
      where: { roles: { some: { role: { name: RoleName.ANALYST } } } },
      select: {
        id: true, name: true, jobTitle: true,
        competencies: { include: { competency: true } },
      },
      orderBy: { name: 'asc' },
    });
    const catalog = await this.prisma.competency.findMany({ orderBy: { name: 'asc' } });

    return {
      competencies: catalog.map((c) => ({ key: c.key, name: c.name })),
      analysts: analysts.map((a) => ({
        id: a.id,
        name: a.name,
        jobTitle: a.jobTitle,
        levels: Object.fromEntries(
          a.competencies.map((uc) => [uc.competency.key, { level: uc.level, scorePct: uc.scorePct ?? 0 }]),
        ),
      })),
    };
  }

  /** Avaliação de competência por um gestor/mentor. */
  async assess(assessedById: string, dto: AssessCompetencyDto) {
    const competency = await this.prisma.competency.findUnique({ where: { key: dto.competencyKey } });
    if (!competency) throw new NotFoundException('Competência não encontrada.');
    return this.prisma.userCompetency.upsert({
      where: { userId_competencyId: { userId: dto.userId, competencyId: competency.id } },
      update: {
        level: dto.level, scorePct: dto.scorePct,
        evidence: dto.evidence ?? 'MANAGER_ASSESSMENT', evidenceRef: dto.evidenceRef, assessedById,
        assessedAt: new Date(),
      },
      create: {
        userId: dto.userId, competencyId: competency.id, level: dto.level, scorePct: dto.scorePct,
        evidence: dto.evidence ?? 'MANAGER_ASSESSMENT', evidenceRef: dto.evidenceRef, assessedById,
      },
    });
  }

  /**
   * Análise de gaps + trilha recomendada. Identifica competências abaixo do
   * limiar e monta uma lista ordenada de cursos/simulados/labs relacionados.
   */
  async gapsAndRecommendation(userId: string) {
    const profile = await this.profile(userId);
    const gaps = profile
      .filter((c) => (c.scorePct ?? 0) < GAP_THRESHOLD)
      .sort((a, b) => (a.scorePct ?? 0) - (b.scorePct ?? 0));

    const targetCategories = new Set<string>();
    for (const g of gaps) (COMPETENCY_TO_CATEGORY[g.key] ?? []).forEach((c) => targetCategories.add(c));

    const [courses, labs, exams] = await Promise.all([
      this.prisma.course.findMany({
        where: { status: 'PUBLISHED', category: { name: { in: [...targetCategories] } } },
        select: { id: true, title: true, slug: true, difficulty: true, estimatedHours: true },
        take: 5,
      }),
      this.prisma.lab.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true, category: true, xpReward: true },
        take: 3,
      }),
      this.prisma.exam.findMany({
        where: { status: 'PUBLISHED', kind: 'SIMULATION' },
        select: { id: true, title: true, category: true },
        take: 3,
      }),
    ]);

    return {
      gaps: gaps.map((g) => ({ key: g.key, name: g.name, scorePct: g.scorePct })),
      recommendedPath: {
        rationale: gaps.length
          ? `Foque em: ${gaps.map((g) => g.name).join(', ')}.`
          : 'Perfil equilibrado — mantenha a prática contínua.',
        courses,
        labs,
        exams,
      },
    };
  }
}
