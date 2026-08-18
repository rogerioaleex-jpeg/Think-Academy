import { Logger } from '@nestjs/common';
import { assertJwtSecret } from './secret';

/**
 * Valida as variáveis de ambiente no boot. Falha rápido em produção mal
 * configurada e emite avisos em dev. Centraliza as checagens que antes estavam
 * espalhadas por `process.env.X ?? default`.
 */
export function validateEnv(): void {
  const logger = new Logger('Env');
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Segredo do JWT (regras detalhadas em common/secret.ts).
  try {
    assertJwtSecret();
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Banco de dados: obrigatório sempre.
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL é obrigatória.');
  }

  // Origem do frontend para CORS: obrigatória em produção.
  if (!process.env.WEB_ORIGIN) {
    (isProd ? errors : warnings).push(
      'WEB_ORIGIN não definida — usando http://localhost:3000 (ok só em dev).',
    );
  }

  // SameSite dos cookies: valor válido + coerência com Secure.
  const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    errors.push(`COOKIE_SAMESITE inválido ("${sameSite}"). Use lax | strict | none.`);
  }
  if (sameSite === 'none' && !isProd) {
    warnings.push('COOKIE_SAMESITE=none exige HTTPS/Secure — cookies não funcionarão em http de dev.');
  }

  // Porta.
  const port = process.env.API_PORT;
  if (port && Number.isNaN(Number(port))) {
    errors.push(`API_PORT inválida ("${port}").`);
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length) {
    logger.error(`Configuração inválida:\n - ${errors.join('\n - ')}`);
    throw new Error('Variáveis de ambiente inválidas. Corrija o .env e reinicie.');
  }
}
