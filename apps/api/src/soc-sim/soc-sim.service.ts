import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IncidentSeverity, IncidentVerdict } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

interface SubmitDto {
  chosenSeverity?: IncidentSeverity;
  chosenTechnique?: string;
  chosenVerdict?: IncidentVerdict;
  actionTaken?: string;
  kqlUsed?: boolean;
}

@Injectable()
export class SocSimService {
  constructor(private prisma: PrismaService, private gamification: GamificationService) {}

  /** Fila de incidentes — sem gabarito. */
  async queue() {
    const incidents = await this.prisma.incident.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, publicId: true, title: true, severity: true, source: true, asset: true, alertTime: true },
      orderBy: { createdAt: 'desc' },
    });
    return incidents;
  }

  /** Detalhe do incidente para investigação — sem revelar o gabarito. */
  async get(id: string) {
    const inc = await this.prisma.incident.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      select: {
        id: true, publicId: true, title: true, severity: true, source: true,
        asset: true, alertTime: true, briefing: true, signins: true,
      },
    });
    if (!inc) throw new NotFoundException('Incidente não encontrado.');
    return inc;
  }

  async start(userId: string, incidentId: string) {
    const inc = await this.prisma.incident.findFirst({ where: { OR: [{ id: incidentId }, { publicId: incidentId }] } });
    if (!inc) throw new NotFoundException('Incidente não encontrado.');
    const existing = await this.prisma.incidentAttempt.findFirst({
      where: { userId, incidentId: inc.id, submittedAt: null },
    });
    if (existing) return existing;
    return this.prisma.incidentAttempt.create({
      data: { incidentId: inc.id, userId, status: 'INVESTIGATING' },
    });
  }

  /** Corrige a tentativa e calcula o SOC Analyst Score. */
  async submit(userId: string, attemptId: string, dto: SubmitDto) {
    const attempt = await this.prisma.incidentAttempt.findUnique({
      where: { id: attemptId }, include: { incident: true },
    });
    if (!attempt) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.submittedAt) throw new BadRequestException('Tentativa já enviada.');

    const inc = attempt.incident;
    const mitreOk = !!dto.chosenTechnique && dto.chosenTechnique.toUpperCase() === inc.correctTechnique.toUpperCase();
    const verdictOk = dto.chosenVerdict === inc.correctVerdict;
    const sevOk = dto.chosenSeverity === inc.correctSeverity;
    const documented = (dto.actionTaken ?? '').trim().length >= 10;

    const scoreDetection = 90;
    const scoreInvestigation = dto.chosenTechnique ? 85 : 60;
    const scoreKql = dto.kqlUsed ? 85 : 60;
    const scoreMitre = mitreOk ? 100 : dto.chosenTechnique ? 40 : 0;
    const scoreDocumentation = documented ? 90 : 55;
    const scoreDecision = (verdictOk ? 50 : 0) + (sevOk ? 45 : 15);
    const overall = Math.round(
      (scoreDetection + scoreInvestigation + scoreKql + scoreMitre + scoreDocumentation + scoreDecision) / 6,
    );

    const updated = await this.prisma.incidentAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'CLOSED',
        chosenSeverity: dto.chosenSeverity, chosenTechnique: dto.chosenTechnique,
        chosenVerdict: dto.chosenVerdict, actionTaken: dto.actionTaken, kqlUsed: dto.kqlUsed ?? false,
        scoreDetection, scoreInvestigation, scoreKql, scoreMitre, scoreDocumentation, scoreDecision, overall,
        submittedAt: new Date(),
      },
    });

    if (overall >= 70) {
      await this.gamification.awardXp(userId, 'EXAM', `incident:${inc.id}`, 200, `SOC Simulator: ${inc.title}`);
    }

    return {
      overall,
      scores: { detection: scoreDetection, investigation: scoreInvestigation, kql: scoreKql, mitre: scoreMitre, documentation: scoreDocumentation, decision: scoreDecision },
      feedback: {
        mitre: mitreOk ? 'Técnica correta.' : `Esperado ${inc.correctTechnique}.`,
        verdict: verdictOk ? 'Classificação correta.' : `Esperado ${inc.correctVerdict}.`,
        severity: sevOk ? 'Severidade correta.' : `Esperado ${inc.correctSeverity}.`,
        recommendedAction: inc.recommendedAction,
      },
      attemptId: updated.id,
    };
  }

  /** Painel operacional (live) derivado dos incidentes e tentativas. */
  async live() {
    const [open, inv, esc, closed] = await Promise.all([
      this.prisma.incident.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.incidentAttempt.count({ where: { status: 'INVESTIGATING' } }),
      this.prisma.incidentAttempt.count({ where: { status: 'ESCALATED' } }),
      this.prisma.incidentAttempt.count({ where: { status: 'CLOSED' } }),
    ]);
    const feed = await this.prisma.incident.findMany({
      select: { publicId: true, title: true, severity: true, asset: true, alertTime: true },
      orderBy: { createdAt: 'desc' }, take: 10,
    });
    return { tiles: { open, investigating: inv, escalated: esc, closedToday: closed }, feed };
  }
}
