import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Endpoint mediador de storage. Só serve conteúdo se o token assinado for
 * válido e não expirado — a autorização real acontece no momento de gerar a
 * URL (ex.: VideosService confere se o usuário tem acesso ao curso).
 */
@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Public()
  @Get('stream')
  @ApiOperation({ summary: 'Serve um objeto a partir de uma URL assinada e expirável.' })
  stream(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
  ) {
    if (!this.storage.verify(key, Number(exp), 'get', sig)) {
      throw new ForbiddenException('URL expirada ou inválida.');
    }
    // Em produção este handler faria proxy/redirect para o objeto no bucket.
    // No dev, apenas confirma o acesso concedido.
    return { ok: true, key, provider: this.storage.provider };
  }
}
