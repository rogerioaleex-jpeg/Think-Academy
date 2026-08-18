import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { SubmitExamDto } from './dto/exam.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private exams: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista provas/simulados publicados.' })
  list() {
    return this.exams.list();
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Inicia uma tentativa e retorna as questões (sem gabarito).' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.exams.start(user.id, id);
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Envia respostas, corrige e devolve o resultado com explicações.' })
  submit(@Param('attemptId') attemptId: string, @Body() dto: SubmitExamDto, @CurrentUser() user: AuthUser) {
    return this.exams.submit(user.id, attemptId, dto);
  }
}
