import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { VideosService } from './videos.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateVideoDto } from './dto/video.dto';

const ADMINS = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.INSTRUCTOR];

@ApiTags('videos')
@ApiBearerAuth()
@Controller('videos')
export class VideosController {
  constructor(private videos: VideosService) {}

  @Get(':id/playback')
  @ApiOperation({ summary: 'URL de reprodução assinada e temporária.' })
  playback(@Param('id') id: string) {
    return this.videos.getPlaybackUrl(id);
  }

  @Roles(...ADMINS)
  @Post()
  @ApiOperation({ summary: 'Cadastra metadados de um vídeo (binário fica no storage).' })
  create(@Body() body: CreateVideoDto) {
    return this.videos.create(body);
  }

  @Roles(...ADMINS)
  @Get('upload-target')
  @ApiOperation({ summary: 'Gera URL de upload assinada para o painel admin.' })
  uploadTarget(@Query('key') key: string) {
    return this.videos.getUploadTarget(key);
  }
}
