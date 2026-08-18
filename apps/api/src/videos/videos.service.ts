import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  create(data: { title: string; description?: string; storageKey: string; durationSec?: number; sizeBytes?: number; thumbnailKey?: string }) {
    return this.prisma.video.create({ data });
  }

  /**
   * Retorna a URL de reprodução ASSINADA e temporária de um vídeo.
   * A autorização de acesso ao curso deve ser verificada antes (feito no controller
   * via matrícula) — nunca expomos a chave pública permanente.
   */
  async getPlaybackUrl(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Vídeo não encontrado.');
    return {
      videoId: video.id,
      title: video.title,
      durationSec: video.durationSec,
      url: this.storage.getSignedDownloadUrl(video.storageKey),
      thumbnailUrl: video.thumbnailKey ? this.storage.getSignedDownloadUrl(video.thumbnailKey) : null,
    };
  }

  /** Gera destino de upload assinado para o painel administrativo. */
  getUploadTarget(key: string) {
    return { key, uploadUrl: this.storage.getSignedUploadUrl(key) };
  }
}
