import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  listThreads(category?: string) {
    return this.prisma.forumThread.findMany({
      where: category ? { category } : undefined,
      include: { _count: { select: { posts: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async getThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: { posts: { orderBy: { createdAt: 'asc' } } },
    });
    if (!thread) throw new NotFoundException('Tópico não encontrado.');
    return thread;
  }

  createThread(author: { id: string; name: string }, dto: { title: string; body: string; category?: string; tags?: string[] }) {
    return this.prisma.forumThread.create({
      data: {
        title: dto.title, body: dto.body, category: dto.category,
        tags: dto.tags ?? [], authorId: author.id, authorName: author.name,
      },
    });
  }

  async reply(author: { id: string; name: string }, threadId: string, body: string) {
    await this.getThread(threadId);
    return this.prisma.forumPost.create({
      data: { threadId, authorId: author.id, authorName: author.name, body },
    });
  }

  voteThread(id: string, dir: 1 | -1) {
    return this.prisma.forumThread.update({ where: { id }, data: { votes: { increment: dir } } });
  }

  votePost(id: string, dir: 1 | -1) {
    return this.prisma.forumPost.update({ where: { id }, data: { votes: { increment: dir } } });
  }
}
