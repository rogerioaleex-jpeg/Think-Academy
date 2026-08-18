import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/** Mock mínimo do PrismaService com os métodos que o AuthService usa. */
function makePrismaMock() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    role: { findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;
}

describe('AuthService', () => {
  let prisma: any;
  let jwt: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrismaMock();
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
    service = new AuthService(prisma, jwt);
  });

  describe('validateAndLogin', () => {
    it('emite tokens com credenciais válidas e persiste apenas o HASH do refresh', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        roles: [{ role: { name: 'STUDENT' } }],
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await service.validateAndLogin({ email: 'a@b.com', password: 'secret123' } as any);

      expect(res.accessToken).toBe('signed.jwt');
      expect(typeof res.refreshToken).toBe('string');
      expect(res.user).toEqual({ id: 'u1', email: 'a@b.com', roles: ['STUDENT'] });

      const created = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(created.tokenHash).not.toBe(res.refreshToken); // nunca guarda o valor em claro
      expect(created.tokenHash).toHaveLength(64); // sha256 hex
    });

    it('rejeita senha inválida sem emitir refresh token', async () => {
      const passwordHash = await bcrypt.hash('correct', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash, roles: [] });
      await expect(
        service.validateAndLogin({ email: 'a@b.com', password: 'wrong' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejeita usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.validateAndLogin({ email: 'x@y.com', password: 'p' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotaciona: revoga o token usado e emite um novo par', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        isActive: true,
        roles: [{ role: { name: 'STUDENT' } }],
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await service.refresh('raw-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(res.accessToken).toBe('signed.jwt');
    });

    it('rejeita token ausente', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita token revogado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10_000),
      });
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejeita token expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      });
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita token desconhecido', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout / logoutAll', () => {
    it('logout revoga o token atual', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('raw');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    });

    it('logout sem token é no-op', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('logoutAll revoga todas as sessões ativas do usuário', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      const res = await service.logoutAll('u1');
      expect(res).toEqual({ revoked: 3 });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('register', () => {
    it('rejeita e-mail já cadastrado', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'a@b.com', name: 'A', password: 'p' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
