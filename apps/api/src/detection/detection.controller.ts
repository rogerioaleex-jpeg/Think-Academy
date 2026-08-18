import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DetectionService } from './detection.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SubmitKqlDto } from './dto/detection.dto';

@ApiTags('detection-engineering')
@ApiBearerAuth()
@Controller('detection')
export class DetectionController {
  constructor(private detection: DetectionService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os desafios de Detection Engineering.' })
  list() {
    return this.detection.listChallenges();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um desafio (logs sintéticos).' })
  get(@Param('id') id: string) {
    return this.detection.get(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Envia uma regra KQL e recebe TP/FP e Detection Score.' })
  submit(@Param('id') id: string, @Body() body: SubmitKqlDto, @CurrentUser() user: AuthUser) {
    return this.detection.submit(user.id, id, body.kql ?? '');
  }
}
