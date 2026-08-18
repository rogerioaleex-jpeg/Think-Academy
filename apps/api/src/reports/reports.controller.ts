import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('manager/overview')
  @ApiOperation({ summary: 'Visão geral do time para o gestor.' })
  overview() {
    return this.reports.managerOverview();
  }

  @Get('roi')
  @ApiOperation({ summary: 'ROI & custos de treinamento (executivo).' })
  roi() {
    return this.reports.roiOverview();
  }

  @Get('talent')
  @ApiOperation({ summary: 'Gestão de talentos: skill matrix e gaps (executivo).' })
  talent() {
    return this.reports.talentOverview();
  }

  @Get('soc-live')
  @ApiOperation({ summary: 'Feed operacional do SOC Simulator (live).' })
  socLive() {
    return this.reports.socLive();
  }

  @Get('analyst/:id')
  @ApiOperation({ summary: 'Perfil técnico detalhado de um analista (gestor).' })
  analyst(@Param('id') id: string) {
    return this.reports.analystProfile(id);
  }

  @Get('talent/report')
  @ApiOperation({ summary: 'Relatório executivo de talentos (exportação).' })
  talentReport() {
    return this.reports.talentReport();
  }
}
