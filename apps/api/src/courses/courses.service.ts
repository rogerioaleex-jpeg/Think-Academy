import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import {
  CreateCourseDto, UpdateCourseDto, CreateModuleDto, CreateLessonDto, UpdateProgressDto,
} from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  list(publishedOnly = true) {
    return this.prisma.course.findMany({
      where: publishedOnly ? { status: 'PUBLISHED' } : undefined,
      include: { category: true, _count: { select: { modules: true, enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lista para o admin (inclui rascunhos e arquivados). */
  adminList() {
    return this.list(false);
  }

  async get(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { video: true, materials: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    return course;
  }

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto });
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.get(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async setPublished(id: string, published: boolean) {
    await this.get(id);
    return this.prisma.course.update({
      where: { id },
      data: { status: published ? 'PUBLISHED' : 'DRAFT', publishedAt: published ? new Date() : null },
    });
  }

  remove(id: string) {
    return this.prisma.course.delete({ where: { id } });
  }

  async addModule(courseId: string, dto: CreateModuleDto) {
    await this.get(courseId);
    const count = await this.prisma.module.count({ where: { courseId } });
    return this.prisma.module.create({
      data: { courseId, title: dto.title, description: dto.description, order: dto.order ?? count },
    });
  }

  async addLesson(moduleId: string, dto: CreateLessonDto) {
    const count = await this.prisma.lesson.count({ where: { moduleId } });
    return this.prisma.lesson.create({
      data: {
        moduleId, title: dto.title, description: dto.description,
        order: dto.order ?? count, videoId: dto.videoId,
      },
    });
  }

  /** Matrícula idempotente do aluno no curso. */
  async enroll(userId: string, courseId: string) {
    await this.get(courseId);
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });
  }

  /** Atribuição em massa: matricula vários usuários em um curso de uma vez. */
  async bulkAssign(courseId: string, userIds: string[]) {
    await this.get(courseId);
    await this.prisma.enrollment.createMany({
      data: userIds.map((userId) => ({ userId, courseId })),
      skipDuplicates: true,
    });
    return { courseId, assigned: userIds.length };
  }

  /**
   * Atualiza o progresso de uma aula e, ao concluir (>=90%), credita XP e
   * recalcula o progresso do curso.
   */
  async updateProgress(userId: string, lessonId: string, dto: UpdateProgressDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');

    const completed = dto.watchedPct >= 90;
    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        watchedPct: dto.watchedPct,
        resumePositionSec: dto.resumePositionSec ?? 0,
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId, lessonId,
        watchedPct: dto.watchedPct,
        resumePositionSec: dto.resumePositionSec ?? 0,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await this.gamification.awardXp(userId, 'LESSON', lessonId, undefined, `Aula: ${lesson.title}`);
      await this.recomputeCourseProgress(userId, lesson.module.courseId);
    }
    return progress;
  }

  /** Recalcula o percentual de conclusão do curso e marca como concluído. */
  async recomputeCourseProgress(userId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({ where: { module: { courseId } } });
    if (totalLessons === 0) return;
    const done = await this.prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { module: { courseId } } },
    });
    const pct = Math.round((done / totalLessons) * 100);
    const isComplete = pct >= 100;
    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { progressPct: pct, status: isComplete ? 'COMPLETED' : 'ACTIVE', completedAt: isComplete ? new Date() : null },
      create: { userId, courseId, progressPct: pct, status: isComplete ? 'COMPLETED' : 'ACTIVE' },
    });
    if (isComplete) await this.gamification.evaluateBadges(userId);
  }
}
