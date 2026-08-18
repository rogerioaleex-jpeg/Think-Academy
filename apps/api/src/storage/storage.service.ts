import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { getJwtSecret } from '../common/secret';

/**
 * Contrato de qualquer backend de storage. Trocar de MinIO para Azure Blob /
 * S3 / R2 é só implementar esta interface e registrar no provider factory.
 */
export interface StorageProvider {
  /** URL temporária de download para uma chave. */
  getSignedDownloadUrl(key: string, ttlSec: number): string;
  /** URL/alvo temporário para upload autenticado. */
  getSignedUploadUrl(key: string, ttlSec: number): string;
}

/**
 * Provider padrão (dev): a API media o acesso via token HMAC expirável.
 * O binário nunca é exposto por URL pública permanente — o player recebe uma
 * URL assinada que aponta para /api/storage/stream e expira em STORAGE_SIGNED_URL_TTL.
 *
 * Em produção, troque por presigned URLs nativas do provedor:
 *   - S3/R2:  @aws-sdk/s3-request-presigner
 *   - Azure:  generateBlobSASQueryParameters
 * mantendo esta mesma interface.
 */
@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private readonly secret = getJwtSecret();
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  readonly provider = process.env.STORAGE_PROVIDER ?? 'minio';

  private sign(key: string, exp: number, mode: 'get' | 'put'): string {
    return createHmac('sha256', this.secret).update(`${mode}:${key}:${exp}`).digest('hex');
  }

  /** Valida um token assinado (usado pelo StorageController). */
  verify(key: string, exp: number, mode: 'get' | 'put', sig: string): boolean {
    if (Date.now() / 1000 > exp) return false;
    return this.sign(key, exp, mode) === sig;
  }

  getSignedDownloadUrl(key: string, ttlSec = Number(process.env.STORAGE_SIGNED_URL_TTL ?? 900)): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = this.sign(key, exp, 'get');
    const q = new URLSearchParams({ key, exp: String(exp), sig, mode: 'get' });
    return `${this.baseUrl}/api/storage/stream?${q.toString()}`;
  }

  getSignedUploadUrl(key: string, ttlSec = 900): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = this.sign(key, exp, 'put');
    const q = new URLSearchParams({ key, exp: String(exp), sig, mode: 'put' });
    return `${this.baseUrl}/api/storage/upload?${q.toString()}`;
  }
}
