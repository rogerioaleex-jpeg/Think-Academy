import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { LabsService } from './labs.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateLabDto, UpdateLabDto, AddChallengeDto, AddHintDto } from './dto/lab-admin.dto';

const ADMINS = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.INSTRUCTOR];

@ApiTags('labs-admin')
@ApiBearerAuth()
@Roles(...ADMINS)
@Controller('admin/labs')
export class LabsAdminController {
  constructor(private labs: LabsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os labs (inclui rascunhos).' })
  list() {
    return this.labs.adminList();
  }

  @Post()
  @ApiOperation({ summary: 'Cria um laboratório.' })
  create(@Body() body: CreateLabDto) {
    return this.labs.createLab(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza campos de um laboratório existente (PATCH parcial).' })
  update(@Param('id') id: string, @Body() body: UpdateLabDto) {
    return this.labs.updateLab(id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove um laboratório PERMANENTEMENTE — cascade em desafios/hints E em qualquer instância/submissão já registrada (ver onDelete: Cascade em LabInstance no schema).',
    description: 'Use com cuidado num lab que já teve alunos reais: o histórico de tentativas some junto. Pra só tirar de circulação sem perder histórico, prefira PATCH status=DRAFT.',
  })
  remove(@Param('id') id: string) {
    return this.labs.deleteLab(id);
  }

  @Post(':id/challenges')
  @ApiOperation({ summary: 'Adiciona um desafio (a flag é armazenada como hash).' })
  addChallenge(@Param('id') id: string, @Body() body: AddChallengeDto) {
    return this.labs.addChallenge(id, body);
  }

  @Post(':id/hints')
  @ApiOperation({ summary: 'Adiciona um hint ao lab.' })
  addHint(@Param('id') id: string, @Body() body: AddHintDto) {
    return this.labs.addHint(id, body);
  }
}
