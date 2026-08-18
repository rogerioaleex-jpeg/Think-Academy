import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async nextPublicId(prefix: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.certificate.count();
    const seq = String(count + 1).padStart(4, '0');
    return `TICA-${prefix}-${year}-${seq}`;
  }

  /** Emite um certificado ao concluir uma trilha (idempotente por usuário+trilha). */
  async issue(userId: string, learningPathId: string) {
    const path = await this.prisma.learningPath.findUnique({ where: { id: learningPathId } });
    if (!path) throw new NotFoundException('Trilha não encontrada.');

    const existing = await this.prisma.certificate.findFirst({ where: { userId, learningPathId } });
    if (existing) return existing;

    const prefix = path.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const publicId = await this.nextPublicId(prefix);

    const cert = await this.prisma.certificate.create({
      data: { publicId, userId, learningPathId, title: path.title, hours: 0 },
    });
    await this.notifications.create(
      userId,
      'CERTIFICATE_ISSUED',
      'Certificado emitido!',
      `Você concluiu a trilha "${path.title}". Certificado ${publicId}.`,
    );
    return cert;
  }

  listForUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId, revoked: false },
      include: { learningPath: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Verificação pública — expõe apenas o mínimo necessário. */
  async verify(publicId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { publicId },
      include: { user: { select: { name: true } } },
    });
    if (!cert || cert.revoked) return { valid: false };
    return {
      valid: true,
      publicId: cert.publicId,
      holder: cert.user.name,
      title: cert.title,
      hours: cert.hours,
      issuedAt: cert.issuedAt,
    };
  }
}
