import { Body, Controller, Get, Post, Req, Res, HttpCode } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, SessionMeta } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from './cookies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private meta(req: Request): SessionMeta {
    return {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Autentica por e-mail/senha e define cookies httpOnly (access + refresh).' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.validateAndLogin(dto, this.meta(req));
    setAuthCookies(res, tokens);
    // Não retornamos o token no corpo — ele vive apenas no cookie httpOnly.
    return { user: tokens.user };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta de aluno (self-service) e define cookies httpOnly.' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto, this.meta(req));
    setAuthCookies(res, tokens);
    return { user: tokens.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotaciona o refresh token (cookie) e renova o access token.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    const tokens = await this.auth.refresh(raw, this.meta(req));
    setAuthCookies(res, tokens);
    return { user: tokens.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoga o refresh token atual e limpa os cookies de sessão.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Encerra TODAS as sessões do usuário (revoga todos os refresh tokens).' })
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logoutAll(user.id);
    clearAuthCookies(res); // encerra também a sessão atual (este dispositivo)
    return result;
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Retorna o usuário autenticado a partir do token (cookie ou Bearer).' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
