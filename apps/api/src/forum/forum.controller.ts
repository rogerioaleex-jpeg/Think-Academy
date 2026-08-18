import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto, ReplyDto } from './dto/forum.dto';

@ApiTags('forum')
@ApiBearerAuth()
@Controller('forum')
export class ForumController {
  constructor(private forum: ForumService, private prisma: PrismaService) {}

  private async displayName(user: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
    return { id: user.id, name: u?.name ?? user.email };
  }

  @Get()
  @ApiOperation({ summary: 'Lista tópicos do fórum (filtro opcional por categoria).' })
  list(@Query('category') category?: string) {
    return this.forum.listThreads(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um tópico com as respostas.' })
  get(@Param('id') id: string) {
    return this.forum.getThread(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um novo tópico.' })
  async create(@Body() dto: CreateThreadDto, @CurrentUser() user: AuthUser) {
    return this.forum.createThread(await this.displayName(user), dto);
  }

  @Post(':id/posts')
  @ApiOperation({ summary: 'Responde a um tópico.' })
  async reply(@Param('id') id: string, @Body() body: ReplyDto, @CurrentUser() user: AuthUser) {
    return this.forum.reply(await this.displayName(user), id, body.body);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vota em um tópico (dir=1|-1).' })
  voteThread(@Param('id') id: string, @Query('dir') dir?: string) {
    return this.forum.voteThread(id, dir === '-1' ? -1 : 1);
  }

  @Post('posts/:id/vote')
  @ApiOperation({ summary: 'Vota em uma resposta.' })
  votePost(@Param('id') id: string, @Query('dir') dir?: string) {
    return this.forum.votePost(id, dir === '-1' ? -1 : 1);
  }
}
