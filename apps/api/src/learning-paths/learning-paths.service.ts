import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class LearningPathsService {
  constructor(
    private prisma: PrismaService,
    private certificates: CertificatesService,
    private gamification: GamificationService,
  ) {}

  list() {
    return this.prisma.learningPath.findMany({
      where: { status: 'PUBLISHED' },
      include: { _count: { select: { courses: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async get(slug: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { slug },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: { course: { include: { _count: { select: { modules: true } } } } },
        },
      },
    });
    if (!path) throw new NotFoundException('Trilha não encontrada.');
    return path;
  }

  async enroll(userId: string, learningPathId: string) {
    return this.prisma.userLearningPath.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      update: {},
      create: { userId, learningPathId },
    });
  }

  /** Progresso do usuário numa trilha = média do progresso dos cursos que a compõem. */
  async progress(userId: string, learningPathId: string) {
    const pathCourses = await this.prisma.learningPathCourse.findMany({
      where: { learningPathId },
      select: { courseId: true },
    });
    const ids = pathCourses.map((c) => c.courseId);
    if (ids.length === 0) return { progressPct: 0 };

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, courseId: { in: ids } },
      select: { progressPct: true },
    });
    const sum = enrollments.reduce((acc, e) => acc + e.progressPct, 0);
    const pct = Math.round(sum / ids.length);

    const completed = pct >= 100;
    await this.prisma.userLearningPath.updateMany({
      where: { userId, learningPathId },
      data: {
        progressPct: pct,
        status: completed ? 'COMPLETED' : 'ACTIVE',
        completedAt: completed ? new Date() : null,
      },
    });

    // Ao concluir a trilha: credita XP de conclusão e emite o certificado.
    if (completed) {
      await this.gamification.awardXp(userId, 'PATH_COMPLETION', learningPathId, undefined, 'Trilha concluída');
      await this.certificates.issue(userId, learningPathId);
    }
    return { progressPct: pct, completed };
  }
}
