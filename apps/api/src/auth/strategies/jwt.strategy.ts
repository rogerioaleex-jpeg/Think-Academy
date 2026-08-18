import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import type { Request } from 'express';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { getJwtSecret } from '../../common/secret';
import { ACCESS_COOKIE } from '../cookies';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

/** Lê o access token do cookie httpOnly; se ausente, cai para o header Bearer. */
const fromCookieOrBearer: JwtFromRequestFunction = (req: Request) => {
  const fromCookie = req?.cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: fromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  // O retorno vira request.user.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, roles: payload.roles ?? [] };
  }
}
