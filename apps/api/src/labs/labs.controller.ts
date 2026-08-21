import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LabsService } from './labs.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SubmitChallengeDto } from './dto/lab-admin.dto';

@ApiTags('labs')
@ApiBearerAuth()
@Controller('labs')
export class LabsController {
  constructor(private labs: LabsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista laboratórios publicados.' })
  list() {
    return this.labs.list();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalha um lab (desafios e hints disponíveis).' })
  get(@Param('slug') slug: string) {
    return this.labs.get(slug);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Provisiona um ambiente isolado para o aluno.' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labs.start(user.id, id);
  }

  @Get('instances/:instanceId')
  @ApiOperation({ summary: 'Consulta status/acesso de uma instância (usado pelo console para polling).' })
  getInstance(@Param('instanceId') instanceId: string, @CurrentUser() user: AuthUser) {
    return this.labs.getInstance(user.id, instanceId);
  }

  @Post('instances/:instanceId/reset')
  @ApiOperation({ summary: 'Reseta (destrói e reprovisiona) a instância.' })
  reset(@Param('instanceId') instanceId: string, @CurrentUser() user: AuthUser) {
    return this.labs.reset(user.id, instanceId);
  }

  @Post('instances/:instanceId/destroy')
  @ApiOperation({ summary: 'Encerra e destrói a instância.' })
  destroy(@Param('instanceId') instanceId: string, @CurrentUser() user: AuthUser) {
    return this.labs.destroy(user.id, instanceId);
  }

  @Post('instances/:instanceId/submit')
  @ApiOperation({ summary: 'Envia a resposta de um desafio para validação server-side.' })
  submit(
    @Param('instanceId') instanceId: string,
    @Body() body: SubmitChallengeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.labs.submit(user.id, instanceId, body.challengeId, body.answer);
  }

  @Post('hints/:hintId/reveal')
  @ApiOperation({ summary: 'Revela um hint (pode custar XP).' })
  reveal(@Param('hintId') hintId: string, @CurrentUser() user: AuthUser) {
    return this.labs.revealHint(user.id, hintId);
  }
}
