/**
 * Gestão centralizada do segredo do JWT.
 * - Em produção, exige JWT_SECRET forte (>= 32 chars) e diferente do default.
 * - Em dev, permite um fallback claramente inseguro (com aviso).
 */
const DEFAULT = 'troque-este-segredo-em-producao';
const DEV_FALLBACK = 'dev-only-insecure-secret-change-me';

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!s || s === DEFAULT) {
    if (isProd) {
      throw new Error('JWT_SECRET forte é obrigatório em produção (defina uma variável de ambiente).');
    }
    return DEV_FALLBACK;
  }
  if (isProd && s.length < 32) {
    throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
  }
  return s;
}

/** Chamado no bootstrap para falhar cedo em produção mal configurada. */
export function assertJwtSecret(): void {
  getJwtSecret();
}
