import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SocSimService } from './soc-sim.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SubmitIncidentDto } from './dto/soc-sim.dto';

@ApiTags('soc-simulator')
@ApiBearerAuth()
@Controller('soc-sim')
export class SocSimController {
  constructor(private sim: SocSimService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Fila de incidentes simulados.' })
  queue() {
    return this.sim.queue();
  }

  @Get('live')
  @ApiOperation({ summary: 'Painel operacional (live).' })
  live() {
    return this.sim.live();
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Detalhe do incidente (sem gabarito).' })
  get(@Param('id') id: string) {
    return this.sim.get(id);
  }

  @Post('incidents/:id/start')
  @ApiOperation({ summary: 'Inicia o atendimento de um incidente.' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sim.start(user.id, id);
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Envia a resolução e recebe o SOC Analyst Score.' })
  submit(
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitIncidentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.sim.submit(user.id, attemptId, dto);
  }
}
