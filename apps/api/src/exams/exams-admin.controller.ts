import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName, Difficulty } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateQuestionDto, CreateExamDto, AttachQuestionsDto, ImportCsvDto, ImportToExamDto } from './dto/admin-exam.dto';

const ADMINS = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.INSTRUCTOR];

/** Administração do banco de questões e das provas. */
@ApiTags('exams-admin')
@ApiBearerAuth()
@Roles(...ADMINS)
@Controller('admin/exams')
export class ExamsAdminController {
  constructor(private prisma: PrismaService) {}

  @Get('questions')
  @ApiOperation({ summary: 'Lista o banco de questões (filtro opcional por categoria).' })
  listQuestions(@Query('category') category?: string) {
    return this.prisma.question.findMany({
      where: category ? { category } : undefined,
      include: { options: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('questions')
  @ApiOperation({ summary: 'Cria uma questão com alternativas.' })
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        prompt: dto.prompt,
        explanation: dto.explanation,
        type: dto.type ?? 'SINGLE_CHOICE',
        difficulty: dto.difficulty ?? 'MEDIUM',
        category: dto.category,
        technology: dto.technology,
        reference: dto.reference,
        points: dto.points ?? 1,
        options: { create: dto.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) },
      },
      include: { options: true },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma prova/simulado.' })
  createExam(@Body() dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        kind: dto.kind ?? 'EXAM',
        category: dto.category,
        difficulty: dto.difficulty ?? 'MEDIUM',
        questionCount: dto.questionCount ?? 0,
        durationMin: dto.durationMin ?? 0,
        passScorePct: dto.passScorePct ?? 70,
        maxAttempts: dto.maxAttempts ?? 0,
        status: 'PUBLISHED',
      },
    });
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Anexa questões existentes a uma prova.' })
  async attach(@Param('id') examId: string, @Body() dto: AttachQuestionsDto) {
    const base = await this.prisma.examQuestion.count({ where: { examId } });
    await this.prisma.examQuestion.createMany({
      data: dto.questionIds.map((questionId, i) => ({ examId, questionId, order: base + i })),
      skipDuplicates: true,
    });
    return this.prisma.exam.update({
      where: { id: examId },
      data: { questionCount: base + dto.questionIds.length },
    });
  }

  @Post('questions/import')
  @ApiOperation({ summary: 'Importa questões via CSV (para o banco).' })
  async importCsv(@Body() dto: ImportCsvDto) {
    const { rows, errors } = this.parseCsv(dto.csv);
    for (const r of rows) await this.prisma.question.create({ data: r });
    return { created: rows.length, errors };
  }

  @Post('import-to-exam')
  @ApiOperation({ summary: 'Importa CSV criando a prova e anexando as questões em um passo.' })
  async importToExam(@Body() dto: ImportToExamDto) {
    const { rows, errors } = this.parseCsv(dto.csv);
    if (rows.length === 0) return { created: 0, errors: errors.length ? errors : ['Nenhuma questão válida.'] };

    const exam = await this.prisma.exam.create({
      data: {
        title: dto.examTitle,
        kind: dto.kind ?? 'SIMULATION',
        category: dto.category ?? rows[0].category ?? null,
        difficulty: 'MEDIUM',
        questionCount: rows.length,
        durationMin: dto.durationMin ?? 30,
        passScorePct: dto.passScorePct ?? 70,
        maxAttempts: 3,
        status: 'PUBLISHED',
      },
    });

    let order = 0;
    for (const r of rows) {
      const q = await this.prisma.question.create({ data: r });
      await this.prisma.examQuestion.create({ data: { examId: exam.id, questionId: q.id, order: order++ } });
    }
    return { examId: exam.id, title: exam.title, created: rows.length, errors };
  }

  /** Converte o CSV em dados de questão prontos para o Prisma. */
  private parseCsv(csv: string) {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines[0]?.toLowerCase().startsWith('prompt')) lines.shift();

    const rows: any[] = [];
    const errors: string[] = [];
    for (const [idx, line] of lines.entries()) {
      const [prompt, category, difficulty, a, b, c, d, correctIndex, explanation] = this.splitCsvLine(line);
      const opts = [a, b, c, d].filter((x) => x !== undefined && x !== '');
      const correct = Number(correctIndex);
      if (!prompt || opts.length < 2 || Number.isNaN(correct) || correct < 0 || correct >= opts.length) {
        errors.push(`Linha ${idx + 1}: formato inválido.`);
        continue;
      }
      rows.push({
        prompt,
        category: category || null,
        difficulty: (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes((difficulty || '').toUpperCase())
          ? (difficulty.toUpperCase() as Difficulty)
          : 'MEDIUM'),
        explanation: explanation || null,
        options: { create: opts.map((text, i) => ({ text, isCorrect: i === correct, order: i })) },
      });
    }
    return { rows, errors };
  }

  /** Parser CSV simples com suporte a campos entre aspas. */
  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }
}
