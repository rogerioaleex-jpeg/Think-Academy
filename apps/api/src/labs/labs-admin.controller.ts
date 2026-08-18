import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { LabsService } from './labs.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateLabDto, AddChallengeDto, AddHintDto } from './dto/lab-admin.dto';

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
