import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Busca global sobre os principais conteúdos. Case-insensitive (contains). */
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    const term = (q ?? '').trim();
    if (term.length < 2) {
      return { query: term, courses: [], learningPaths: [], lessons: [], labs: [], questions: [] };
    }
    const like = { contains: term, mode: 'insensitive' as const };

    const [courses, learningPaths, lessons, labs, questions] = await Promise.all([
      this.prisma.course.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { shortDescription: like }] },
        select: { id: true, title: true, slug: true, difficulty: true },
        take: 8,
      }),
      this.prisma.learningPath.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { description: like }] },
        select: { id: true, title: true, slug: true },
        take: 6,
      }),
      this.prisma.lesson.findMany({
        where: { title: like, module: { course: { status: 'PUBLISHED' } } },
        select: { id: true, title: true, module: { select: { courseId: true } } },
        take: 8,
      }),
      this.prisma.lab.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { objective: like }] },
        select: { id: true, title: true, slug: true, category: true },
        take: 8,
      }),
      this.prisma.question.findMany({
        where: { OR: [{ prompt: like }, { category: like }] },
        select: { id: true, prompt: true, category: true },
        take: 8,
      }),
    ]);

    return {
      query: term,
      courses,
      learningPaths,
      lessons: lessons.map((l) => ({ id: l.id, title: l.title, courseId: l.module.courseId })),
      labs,
      questions,
    };
  }
}
