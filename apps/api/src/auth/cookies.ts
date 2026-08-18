import type { Response } from 'express';
import type { IssuedTokens } from './auth.service';

/**
 * Nomes e opções dos cookies de autenticação.
 *
 * O access token e o refresh token trafegam SOMENTE em cookies:
 *  - httpOnly  → JavaScript não lê o token (fecha exfiltração via XSS).
 *  - secure    → só em HTTPS (ligado em produção; desligado em dev http).
 *  - sameSite  → 'lax' por padrão (protege contra CSRF em navegação cross-site);
 *                configurável por COOKIE_SAMESITE (use 'none' apenas com HTTPS
 *                quando front e API estiverem em sites diferentes).
 * O refresh token tem path restrito a /api/auth para não ser enviado em toda
 * requisição da API — só nas rotas de refresh/logout.
 */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/api/auth';

type SameSite = 'lax' | 'strict' | 'none';

function sameSite(): SameSite {
  const v = (process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase();
  return v === 'strict' || v === 'none' ? (v as SameSite) : 'lax';
}

function isSecure(): boolean {
  // sameSite=none exige Secure; caso contrário, segue o ambiente.
  return process.env.NODE_ENV === 'production' || sameSite() === 'none';
}

function baseOptions() {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: sameSite(),
    ...(domain ? { domain } : {}),
  } as const;
}

export function setAuthCookies(res: Response, tokens: IssuedTokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: '/',
    maxAge: tokens.accessMaxAgeMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    maxAge: tokens.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH });
}
