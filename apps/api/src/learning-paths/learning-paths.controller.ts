import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LearningPathsService } from './learning-paths.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('learning-paths')
@ApiBearerAuth()
@Controller('learning-paths')
export class LearningPathsController {
  constructor(private paths: LearningPathsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista trilhas publicadas.' })
  list() {
    return this.paths.list();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalha uma trilha e seus cursos.' })
  get(@Param('slug') slug: string) {
    return this.paths.get(slug);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Matricula o aluno na trilha.' })
  enroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paths.enroll(user.id, id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Progresso do aluno na trilha.' })
  progress(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paths.progress(user.id, id);
  }
}
