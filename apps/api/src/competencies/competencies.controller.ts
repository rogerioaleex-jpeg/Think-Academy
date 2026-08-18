import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { CompetenciesService } from './competencies.service';
import { AssessCompetencyDto } from './dto/competency.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('competencies')
@ApiBearerAuth()
@Controller('competencies')
export class CompetenciesController {
  constructor(private competencies: CompetenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de competências.' })
  catalog() {
    return this.competencies.listCatalog();
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil de competências (radar) do aluno.' })
  myProfile(@CurrentUser() user: AuthUser) {
    return this.competencies.profile(user.id);
  }

  @Get('me/gaps')
  @ApiOperation({ summary: 'Análise de gaps + trilha recomendada (Competency Engine).' })
  myGaps(@CurrentUser() user: AuthUser) {
    return this.competencies.gapsAndRecommendation(user.id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.MENTOR)
  @Get('team/matrix')
  @ApiOperation({ summary: 'Matriz de competências da equipe (gestor).' })
  matrix() {
    return this.competencies.teamMatrix();
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.MENTOR)
  @Post('assess')
  @ApiOperation({ summary: 'Registra a avaliação de competência de um analista.' })
  assess(@Body() dto: AssessCompetencyDto, @CurrentUser() user: AuthUser) {
    return this.competencies.assess(user.id, dto);
  }
}
