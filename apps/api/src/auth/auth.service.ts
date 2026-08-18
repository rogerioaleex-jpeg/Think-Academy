import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { RoleName } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/** Metadados opcionais da sessão (para auditoria dos refresh tokens). */
export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  user: { id: string; email: string; roles: string[] };
}

interface AuthUserLite {
  id: string;
  email: string;
  roles: string[];
}

// TTLs — access curto (limita janela de uso de um token roubado); refresh longo.
const ACCESS_TTL = process.env.JWT_EXPIRES_IN ?? '15m';
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /** SHA-256 do refresh token — só o hash é persistido. */
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Emite access token (JWT) + refresh token opaco (persistido como hash). */
  private async issueTokens(user: AuthUserLite, meta: SessionMeta = {}): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, roles: user.roles },
      { expiresIn: ACCESS_TTL },
    );

    const rawRefresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(rawRefresh),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
        userAgent: meta.userAgent?.slice(0, 256),
        ip: meta.ip?.slice(0, 64),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      accessMaxAgeMs: ACCESS_MAX_AGE_MS,
      refreshMaxAgeMs: REFRESH_MAX_AGE_MS,
      user,
    };
  }

  async validateAndLogin(dto: LoginDto, meta: SessionMeta = {}): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciais inválidas.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(
      { id: user.id, email: user.email, roles: user.roles.map((r) => r.role.name) },
      meta,
    );
  }

  async register(dto: RegisterDto, meta: SessionMeta = {}): Promise<IssuedTokens> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado.');

    const studentRole = await this.prisma.role.findUnique({ where: { name: RoleName.STUDENT } });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        roles: studentRole ? { create: [{ roleId: studentRole.id }] } : undefined,
      },
    });

    return this.issueTokens({ id: user.id, email: user.email, roles: [RoleName.STUDENT] }, meta);
  }

  /**
   * Rotação do refresh token: valida o token do cookie, revoga-o e emite um
   * novo par. Rejeita tokens ausentes/expirados/revogados/desconhecidos.
   */
  async refresh(rawRefresh: string | undefined, meta: SessionMeta = {}): Promise<IssuedTokens> {
    if (!rawRefresh) throw new UnauthorizedException('Sessão expirada.');

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawRefresh) },
    });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Sessão expirada.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Sessão expirada.');

    // Revoga o token usado (rotação) antes de emitir o novo.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { id: user.id, email: user.email, roles: user.roles.map((r) => r.role.name) },
      meta,
    );
  }

  /** Logout: revoga o refresh token atual (best-effort). */
  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Logout global: revoga TODOS os refresh tokens ativos do usuário — encerra
   * todas as sessões em todos os dispositivos. Útil após troca de senha,
   * suspeita de comprometimento ou a pedido do próprio usuário.
   * Retorna quantas sessões foram encerradas.
   */
  async logoutAll(userId: string): Promise<{ revoked: number }> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: count };
  }

  // Placeholder para SSO (Microsoft Entra ID / OIDC) — fase futura.
  // Fluxo: validar id_token do Entra, encontrar/criar usuário por externalId,
  // e emitir o mesmo par de tokens interno via issueTokens().
  async oidcLoginStub(): Promise<never> {
    throw new UnauthorizedException('SSO (Entra ID) ainda não configurado. Ver docs/04-main-flows.md.');
  }
}
