# Segurança — Think IT Cyber Academy

Resumo da postura de segurança da API/aplicação e das correções aplicadas.

## SQL Injection

**Não aplicável / mitigado por design.** Todo o acesso a dados usa o **Prisma ORM**, que gera consultas parametrizadas — parâmetros nunca são concatenados como string. Não há uso de `$queryRawUnsafe`/`$executeRawUnsafe`. A única consulta "raw" é o healthcheck `SELECT 1` via *tagged template* (`$queryRaw`), que também é parametrizado. Filtros vindos de query params (ex.: busca `contains`, filtro por categoria) passam pelo Prisma e são escapados automaticamente.

Diretriz: **proibido** introduzir `queryRawUnsafe`/`executeRawUnsafe` ou concatenar SQL.

## Validação de entrada (injeção de dados / mass-assignment)

- `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`: campos não declarados são **rejeitados**, tipos são coeridos e mass-assignment é bloqueado.
- **Todos** os endpoints agora usam DTOs com `class-validator` (nada de `@Body()` com objeto solto). Inclui: fórum, SOC Simulator, Detection Engineering, vídeos, categorias, certificados, atribuição em massa, admin de labs e configurações de segurança.
- Limites de tamanho: `MaxLength`/`ArrayMaxSize` nos DTOs e limite global de corpo de **1 MB** (`express.json({ limit })`) — mitiga DoS por payload.

## XSS

- O **frontend em React** escapa por padrão todo texto renderizado via JSX.
- `dangerouslySetInnerHTML` é usado **apenas** para markup estático confiável (o layout do Stitch/protótipo e ícones SVG) — nunca com dados vindos do usuário.
- Para qualquer conteúdo gerado por usuário que venha a ser injetado como HTML (ex.: posts do fórum), use o helper `escapeHtml()` de `lib/api.ts` ou renderize via JSX. O backend também limita o tamanho desses campos.
- `helmet` adiciona cabeçalhos de segurança (X-Content-Type-Options, X-Frame-Options/anti-clickjacking, HSTS, Referrer-Policy, etc.).
- **Content-Security-Policy explícita** (`helmet` em `main.ts`): `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` (bloqueia embedding), `img-src 'self' data:`. Como a API só serve JSON + Swagger, a policy é restritiva; `'unsafe-inline'` fica limitado ao script/style do Swagger UI. Ajuste `connect-src`/`img-src` conforme os domínios reais de mídia/CDN.
- **Token JWT fora do `localStorage`**: o access/refresh token vive apenas em cookie `httpOnly`, então JavaScript (inclusive um payload de XSS) **não consegue ler nem exfiltrar** o token.

## Autenticação e segredos

- Senhas com **bcrypt**. JWT assinado; o segredo é centralizado em `common/secret.ts`, que **falha o boot em produção** se `JWT_SECRET` estiver ausente, for o valor default ou tiver menos de 32 caracteres. Em dev, usa um fallback claramente rotulado como inseguro.
- **Sessão por cookie `httpOnly` + Secure + SameSite** (`auth/cookies.ts`):
  - **access token** (JWT curto, 15 min) em cookie `httpOnly`, `path=/`.
  - **refresh token** opaco (`crypto.randomBytes`, 7 dias) em cookie `httpOnly` com `path=/api/auth` — só trafega nas rotas de refresh/logout, não em toda requisição.
  - `Secure` é ligado automaticamente em produção; `SameSite` configurável (`COOKIE_SAMESITE`, padrão `lax`).
  - Refresh tokens são persistidos **apenas como hash SHA-256** (o valor em claro só existe no cookie). `POST /auth/refresh` faz **rotação** (revoga o token usado e emite um novo); `POST /auth/logout` revoga o token atual e limpa os cookies; `POST /auth/logout-all` revoga **todas** as sessões do usuário (troca de senha / suspeita de comprometimento). Tokens revogados/expirados são rejeitados.
  - Um job diário (`JobsService.pruneRefreshTokens`) remove tokens expirados e os revogados há mais de 7 dias, mantendo a tabela enxuta sem perder revogações recentes para auditoria.
  - A `JwtStrategy` lê o token do cookie e, como fallback, aceita `Authorization: Bearer` (útil para clientes de API/CI).
- Autorização por papéis (**RBAC**) via `@Roles()` + `RolesGuard` global; `JwtAuthGuard` global com `@Public()` para rotas abertas.
- CORS restrito à origem do frontend (`WEB_ORIGIN`) com `credentials: true` (necessário para os cookies).
- **Rate limiting** global (`@nestjs/throttler`, 120 req/min por IP).

## CSRF

Com o token agora em cookie, o vetor de CSRF é mitigado por **`SameSite=lax`** (padrão) — o navegador não envia o cookie em requisições cross-site que mudam estado (POST/PUT/DELETE a partir de outro site). O access token expira em 15 min e o refresh fica restrito a `/api/auth`. Em produção com frontend/API em sites diferentes (que exige `SameSite=none`), **habilite adicionalmente um token anti-CSRF** (double-submit cookie) ou verifique o header `Origin`/`Sec-Fetch-Site` nas rotas mutantes.

## Laboratórios

Ambientes isolados em rede Docker `--internal` (sem rota para a rede corporativa), `cap-drop ALL`, `no-new-privileges`, read-only, limites de CPU/RAM/PIDs e destruição automática por expiração. Flags/answers de desafios são guardadas como **hash** (nunca em texto) e validadas server-side.

## Tratamento de erros, validação de ambiente e observabilidade

- **Filtro global de exceções** (`common/filters/all-exceptions.filter.ts`): padroniza o corpo de erro (`{ statusCode, error, message, path, timestamp, requestId }`) e **não vaza detalhes internos de 5xx em produção** (o stack vai só para o log). Erros esperados (`HttpException`, validação) preservam status e mensagem.
- **Validação de ambiente no boot** (`common/env.validation.ts`): falha rápido em produção mal configurada (segredo do JWT fraco, `DATABASE_URL`/`WEB_ORIGIN` ausentes, `COOKIE_SAMESITE` inválido) e avisa em dev — evita subir com configuração insegura silenciosa.
- **Correlação e auditoria**: cada requisição recebe um `x-request-id` (respeitando o de entrada atrás de proxy) presente nos logs e no envelope de erro. O `LoggingInterceptor` registra método, rota, status e duração.
- **Readiness** (`/api/ready`) retorna **503** quando o banco está fora, para o orquestrador remover a réplica do tráfego.
- **Testes automatizados (Jest)** cobrem a lógica sensível de auth (rotação/revogação de refresh token, rejeição de token expirado/revogado, logout global) — regressões de segurança são pegas no CI, que também roda `pnpm audit` com corte em severidade alta.

## Recomendações residuais (produção)

1. ✅ **Feito** — JWT migrado do `localStorage` para **cookie httpOnly + Secure + SameSite** com refresh token rotativo (ver "Autenticação e segredos").
2. ✅ **Feito** — Content-Security-Policy explícita configurada no `helmet`. Continuar endurecendo `connect-src`/`img-src` conforme os domínios reais de mídia/CDN entrarem em uso.
3. Upload de arquivos: validar MIME real + tamanho + antivírus antes de gravar no storage (a arquitetura já usa signed URLs).
4. Auditar dependências no CI (`npm audit` / SCA) e habilitar Dependabot.
5. Segredos via cofre (Azure Key Vault) em produção, nunca no código.
6. O avaliador de KQL do Detection Engineering é heurístico (não executa código) — se um dia executar consultas de verdade, rodar em sandbox isolado.
7. ✅ **Feito** — limpeza diária dos `refresh_tokens` expirados/revogados via cron (`JobsService`).
8. Se adotar `SameSite=none` (front/API em sites distintos), adicionar proteção anti-CSRF explícita (double-submit token ou checagem de `Origin`).

## Migração (rodar localmente)

O modelo `RefreshToken` foi adicionado ao schema. Após `pnpm install` (novas deps: `cookie-parser`), gere o client e aplique a migração:

```bash
pnpm --filter @tica/database prisma generate
pnpm --filter @tica/database prisma migrate dev -n add_refresh_token
```
