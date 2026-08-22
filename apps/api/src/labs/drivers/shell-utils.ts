/**
 * Escapa uma string para uso segura como argumento de shell (POSIX
 * single-quote escaping). Necessário porque `exec()` roda o comando via
 * `/bin/sh -c "<string>"` — sem isso, valores com backtick/parênteses (como
 * a regra `Host(\`...\`)` do Traefik) quebram o shell. Validado em produção:
 * sem essa proteção, `docker run` falhava com
 * `/bin/sh: Syntax error: "(" unexpected`.
 *
 * Compartilhado entre `docker.driver.ts` e `vm.driver.ts` — os dois montam
 * labels do Traefik do mesmo jeito.
 */
export const shQuote = (v: string) => `'${v.replace(/'/g, `'"'"'`)}'`;
