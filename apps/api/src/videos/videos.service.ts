import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  create(data: { title: string; description?: string; storageKey?: string; externalUrl?: string; durationSec?: number; sizeBytes?: number; thumbnailKey?: string }) {
    if (!data.storageKey && !data.externalUrl) {
      throw new BadRequestException('Informe storageKey (bucket) ou externalUrl (YouTube/Vimeo/etc.).');
    }
    return this.prisma.video.create({ data });
  }

  /**
   * Retorna a URL de reprodução de um vídeo: direta se for externo
   * (YouTube/Vimeo/etc.), ou ASSINADA e temporária se estiver no bucket próprio.
   * A autorização de acesso ao curso deve ser verificada antes (feito no controller
   * via matrícula) — nunca expomos a chave pública permanente do bucket.
   */
  async getPlaybackUrl(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Vídeo não encontrado.');
    return {
      videoId: video.id,
      title: video.title,
      durationSec: video.durationSec,
      external: !!video.externalUrl,
      url: video.externalUrl ?? this.storage.getSignedDownloadUrl(video.storageKey!),
      thumbnailUrl: video.thumbnailKey ? this.storage.getSignedDownloadUrl(video.thumbnailKey) : null,
    };
  }

  /** Gera destino de upload assinado para o painel administrativo. */
  getUploadTarget(key: string) {
    return { key, uploadUrl: this.storage.getSignedUploadUrl(key) };
  }
}
