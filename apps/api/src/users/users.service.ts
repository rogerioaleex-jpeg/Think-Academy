import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, jobTitle: true, totalXp: true, level: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const { passwordHash, ...safe } = user;
    return { ...safe, roles: user.roles.map((r) => r.role.name) };
  }

  /** Perfil completo do aluno: XP, badges, competências e progresso. */
  async profile(id: string) {
    const [user, badges, competencies, enrollments, attempts, labInstances] = await Promise.all([
      this.prisma.user.findUnique({ where: { id } }),
      this.prisma.userBadge.findMany({ where: { userId: id }, include: { badge: true } }),
      this.prisma.userCompetency.findMany({ where: { userId: id }, include: { competency: true } }),
      this.prisma.enrollment.findMany({ where: { userId: id } }),
      this.prisma.examAttempt.count({ where: { userId: id, status: 'GRADED' } }),
      this.prisma.labInstance.count({ where: { userId: id } }),
    ]);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return {
      id: user.id,
      name: user.name,
      jobTitle: user.jobTitle,
      level: user.level,
      totalXp: user.totalXp,
      courses: { total: enrollments.length, completed: enrollments.filter((e) => e.status === 'COMPLETED').length },
      exams: attempts,
      labs: labInstances,
      badges: badges.map((b) => ({ name: b.badge.name, slug: b.badge.slug, icon: b.badge.icon, earnedAt: b.earnedAt })),
      competencies: competencies.map((c) => ({
        key: c.competency.key, name: c.competency.name, level: c.level, scorePct: c.scorePct,
      })),
    };
  }
}
