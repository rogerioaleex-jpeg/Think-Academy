import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { SubmitExamDto } from './dto/exam.dto';

/** Embaralha um array (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  list() {
    return this.prisma.exam.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, title: true, kind: true, category: true, difficulty: true,
        questionCount: true, durationMin: true, passScorePct: true, maxAttempts: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Inicia uma tentativa: valida tentativas máximas, sorteia as questões
   * (randomize) e devolve o enunciado SEM revelar a alternativa correta.
   */
  async start(userId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { include: { question: { include: { options: true } } } } },
    });
    if (!exam) throw new NotFoundException('Prova não encontrada.');

    if (exam.maxAttempts > 0) {
      const used = await this.prisma.examAttempt.count({
        where: { userId, examId, status: { in: ['SUBMITTED', 'GRADED', 'EXPIRED'] } },
      });
      if (used >= exam.maxAttempts) {
        throw new ForbiddenException('Número máximo de tentativas atingido.');
      }
    }

    let pool = exam.questions.map((eq) => eq.question);
    if (exam.randomize) pool = shuffle(pool);
    if (exam.questionCount > 0) pool = pool.slice(0, exam.questionCount);

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId, userId, status: 'IN_PROGRESS',
        expiresAt: exam.durationMin > 0 ? new Date(Date.now() + exam.durationMin * 60_000) : null,
      },
    });

    return {
      attemptId: attempt.id,
      expiresAt: attempt.expiresAt,
      durationMin: exam.durationMin,
      passScorePct: exam.passScorePct,
      questions: pool.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        options: (exam.shuffleOptions ? shuffle(q.options) : q.options).map((o) => ({ id: o.id, text: o.text })),
      })),
    };
  }

  /** Corrige a tentativa, persiste respostas, calcula nota e credita XP. */
  async submit(userId: string, attemptId: string, dto: SubmitExamDto) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });
    if (!attempt) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.userId !== userId) throw new ForbiddenException('Tentativa de outro usuário.');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Tentativa já finalizada.');

    const expired = attempt.expiresAt ? attempt.expiresAt.getTime() < Date.now() : false;

    const questionIds = dto.answers.map((a) => a.questionId);
    const correctOptions = await this.prisma.questionOption.findMany({
      where: { questionId: { in: questionIds }, isCorrect: true },
      select: { id: true, questionId: true },
    });
    const correctByQuestion = new Map(correctOptions.map((o) => [o.questionId, o.id]));

    let correctCount = 0;
    const answerRows = dto.answers.map((a) => {
      const isCorrect = correctByQuestion.get(a.questionId) === a.selectedOptionId && !!a.selectedOptionId;
      if (isCorrect) correctCount++;
      return {
        attemptId, questionId: a.questionId,
        selectedOptionId: a.selectedOptionId ?? null, isCorrect,
      };
    });
    await this.prisma.examAnswer.createMany({ data: answerRows });

    const total = dto.answers.length || 1;
    const scorePct = Math.round((correctCount / total) * 100);
    const passed = !expired && scorePct >= attempt.exam.passScorePct;

    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: expired ? 'EXPIRED' : 'GRADED',
        scorePct, passed, submittedAt: new Date(),
      },
    });

    if (passed) {
      const source = attempt.exam.kind === 'QUIZ' ? 'QUIZ' : 'EXAM';
      await this.gamification.awardXp(userId, source, attempt.examId, undefined, `Prova: ${attempt.exam.title}`);
    }

    // Feedback com explicações (item 15 do PRD).
    const explanations = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, explanation: true, reference: true },
    });

    return {
      attemptId, scorePct, passed, expired,
      correct: correctCount, total,
      passScorePct: attempt.exam.passScorePct,
      review: answerRows.map((r) => ({
        questionId: r.questionId,
        correct: r.isCorrect,
        correctOptionId: correctByQuestion.get(r.questionId) ?? null,
        explanation: explanations.find((e) => e.id === r.questionId)?.explanation ?? null,
      })),
    };
  }
}
