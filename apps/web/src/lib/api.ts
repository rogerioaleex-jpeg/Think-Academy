/**
 * Escapa HTML — use SEMPRE ao injetar conteúdo do usuário (ex.: posts do fórum)
 * em dangerouslySetInnerHTML. Preferir renderização via JSX (que já escapa).
 */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Cliente HTTP da API.
 *
 * Autenticação por COOKIE httpOnly: o access/refresh token NÃO ficam mais no
 * localStorage (fecha exfiltração via XSS). O browser envia os cookies
 * automaticamente graças a `credentials: 'include'`; o JS nunca vê o token.
 * Em 401 (access token expirado) tentamos UMA rotação via /auth/refresh e
 * repetimos a requisição original.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
}

async function raw(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API}/api${path}`, {
    ...options,
    credentials: 'include', // envia/recebe os cookies httpOnly
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });
}

let refreshing: Promise<boolean> | null = null;

/** Tenta rotacionar a sessão. Deduplica chamadas concorrentes. */
async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = raw('/auth/refresh', { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const isAuthFlow = path.startsWith('/auth/refresh') || path.startsWith('/auth/logout');

  let res = await raw(path, options);

  // Access token expirado → tenta refresh uma vez e repete.
  if (res.status === 401 && !isAuthFlow) {
    const ok = await tryRefresh();
    if (ok) res = await raw(path, options);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erro ${res.status}`);
  }
  // 204 / corpo vazio
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => ({}))) as T;
}

/** Login: define os cookies httpOnly e retorna o usuário. */
export async function login(email: string, password: string): Promise<SessionUser> {
  const { user } = await api<{ user: SessionUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return user;
}

/** Logout: revoga o refresh token e limpa os cookies. */
export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
}

/** Logout global: encerra a sessão em TODOS os dispositivos. */
export async function logoutAll(): Promise<{ revoked: number }> {
  return api<{ revoked: number }>('/auth/logout-all', { method: 'POST' });
}

/** Retorna o usuário autenticado (ou null se a sessão não for válida). */
export async function getMe(): Promise<SessionUser | null> {
  try {
    return await api<SessionUser>('/auth/me');
  } catch {
    return null;
  }
}
