import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { CoursesService } from './courses.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateCourseDto, UpdateCourseDto, CreateModuleDto, CreateLessonDto, UpdateProgressDto, BulkAssignDto,
} from './dto/course.dto';

const ADMINS = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.INSTRUCTOR];

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista cursos publicados.' })
  list() {
    return this.courses.list(true);
  }

  @Roles(...ADMINS)
  @Get('admin/all')
  @ApiOperation({ summary: 'Lista todos os cursos (inclui rascunhos) — admin.' })
  adminList() {
    return this.courses.adminList();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um curso com módulos e aulas.' })
  get(@Param('id') id: string) {
    return this.courses.get(id);
  }

  @Roles(...ADMINS)
  @Post()
  @ApiOperation({ summary: 'Cria um curso.' })
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @Roles(...ADMINS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Roles(...ADMINS)
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publica ou despublica um curso (?published=false).' })
  publish(@Param('id') id: string, @Query('published') published?: string) {
    return this.courses.setPublished(id, published !== 'false');
  }

  @Roles(...ADMINS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courses.remove(id);
  }

  @Roles(...ADMINS)
  @Post(':id/modules')
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.courses.addModule(id, dto);
  }

  @Roles(...ADMINS)
  @Post('modules/:moduleId/lessons')
  addLesson(@Param('moduleId') moduleId: string, @Body() dto: CreateLessonDto) {
    return this.courses.addLesson(moduleId, dto);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Matricula o aluno autenticado no curso.' })
  enroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.courses.enroll(user.id, id);
  }

  @Get(':id/my-progress')
  @ApiOperation({ summary: 'Matrícula e progresso do aluno autenticado nas aulas do curso.' })
  myProgress(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.courses.myProgress(user.id, id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Post(':id/bulk-assign')
  @ApiOperation({ summary: 'Atribuição em massa: matricula vários usuários no curso.' })
  bulkAssign(@Param('id') id: string, @Body() body: BulkAssignDto) {
    return this.courses.bulkAssign(id, body.userIds ?? []);
  }

  @Post('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Registra progresso de uma aula (retomada + conclusão).' })
  progress(@Param('lessonId') lessonId: string, @Body() dto: UpdateProgressDto, @CurrentUser() user: AuthUser) {
    return this.courses.updateProgress(user.id, lessonId, dto);
  }
}
