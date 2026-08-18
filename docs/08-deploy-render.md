# Deploy no Render

Este guia sobe a **Think IT Cyber Academy** no [Render](https://render.com): um banco **PostgreSQL** gerenciado, a **API** (NestJS) e o **web** (Next.js). Existe um Blueprint pronto (`render.yaml`) que cria os três recursos de uma vez.

> **O que NÃO funciona no Render:** os **laboratórios** dependem de orquestração Docker (rede isolada, containers efêmeros) e **não rodam** em web services gerenciados — o resto da plataforma (LMS, trilhas, provas, gamificação, SOC Simulator, competências, certificados, fórum, relatórios) funciona normalmente. Redis e storage S3 são **opcionais**: sem eles a app sobe, e o streaming de mídia é mediado pela própria API via URLs assinadas.

## Pré-requisitos

1. Código em um repositório **GitHub/GitLab** (o Render faz deploy a partir dele).
2. (Recomendado) Gere e comite o **lockfile** para builds reproduzíveis:
   ```bash
   pnpm install            # cria pnpm-lock.yaml
   git add pnpm-lock.yaml && git commit -m "chore: lockfile"
   ```
3. Uma conta no Render (o plano **free** já serve para validar).

---

## Opção A — Blueprint (recomendado, 1 clique)

1. No dashboard do Render: **New + → Blueprint**.
2. Conecte o repositório. O Render detecta o `render.yaml` e mostra os 3 recursos (`tica-db`, `tica-api`, `tica-web`). Clique **Apply**.
3. O primeiro build sobe o banco e as duas apps. O `JWT_SECRET` é gerado automaticamente e o `DATABASE_URL` é injetado a partir do banco. O schema é criado no build da API via `prisma db push`.
4. **Preencher as URLs** (elas só existem depois da criação). Anote as URLs públicas geradas, por exemplo:
   - API: `https://tica-api.onrender.com`
   - Web: `https://tica-web.onrender.com`

   Então defina as variáveis marcadas como *"set in dashboard"*:

   | Serviço | Variável | Valor |
   |---|---|---|
   | `tica-api` | `WEB_ORIGIN` | `https://tica-web.onrender.com` |
   | `tica-api` | `NEXT_PUBLIC_API_URL` | `https://tica-api.onrender.com` |
   | `tica-web` | `NEXT_PUBLIC_API_URL` | `https://tica-api.onrender.com` |

5. **Redeploy** dos dois serviços (o `NEXT_PUBLIC_API_URL` do web é *inlinado no build*, então precisa reconstruir). Em cada serviço: **Manual Deploy → Deploy latest commit**.
6. (Opcional) **Popular dados de exemplo** — ver [Seed](#seed-dados-de-exemplo).

Pronto: acesse a URL do `tica-web`.

---

## Opção B — Manual (sem Blueprint)

### 1. Banco
**New + → PostgreSQL** → nome `tica-db`, plano free. Copie a **Internal Connection String**.

### 2. API (Web Service)
**New + → Web Service** → conecte o repo. Configure:

- **Runtime:** Node
- **Build Command:**
  ```bash
  corepack enable && pnpm install --prod=false && \
  pnpm --filter @tica/database run build && \
  pnpm --filter @tica/database exec prisma db push --skip-generate && \
  pnpm --filter @tica/api run build
  ```
- **Start Command:** `pnpm --filter @tica/api run start:prod`
- **Health Check Path:** `/api/health`
- **Environment:**
  | Variável | Valor |
  |---|---|
  | `NODE_ENV` | `production` |
  | `DATABASE_URL` | *(Internal Connection String do tica-db)* |
  | `JWT_SECRET` | *(uma string forte, ≥ 32 chars)* |
  | `JWT_EXPIRES_IN` | `15m` |
  | `COOKIE_SAMESITE` | `none` |
  | `WEB_ORIGIN` | `https://SEU-web.onrender.com` |
  | `NEXT_PUBLIC_API_URL` | `https://SEU-api.onrender.com` |

### 3. Web (Web Service)
**New + → Web Service** → mesmo repo:

- **Build Command:** `corepack enable && pnpm install --prod=false && pnpm --filter @tica/web run build`
- **Start Command:** `pnpm --filter @tica/web exec next start -p $PORT`
- **Health Check Path:** `/`
- **Environment:** `NODE_ENV=production`, `NEXT_PUBLIC_API_URL=https://SEU-api.onrender.com`

Depois que as URLs existirem, confirme `WEB_ORIGIN` (API) e `NEXT_PUBLIC_API_URL` (ambos) e faça redeploy do web.

---

## Cookies entre domínios (importante)

A sessão usa cookies `httpOnly`. Como a API e o web ficam em **subdomínios diferentes** de `onrender.com`, o navegador trata as chamadas como *cross-site* — por isso `COOKIE_SAMESITE=none` (e `Secure`, que o `NODE_ENV=production` já liga). O CORS da API precisa apontar para o web via `WEB_ORIGIN`, com `credentials: true` (já configurado).

**Mais robusto (recomendado para produção real):** use um **domínio próprio** com a API em `api.suaempresa.com` e o web em `app.suaempresa.com`. Aí as requisições são *same-site* e você pode usar:

```
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=.suaempresa.com
```

Isso evita depender de cookies de terceiros (que navegadores vêm restringindo). Configure os domínios em cada serviço no Render (**Settings → Custom Domains**) e ajuste as variáveis.

---

## Seed (dados de exemplo)

O `prisma db push` cria as tabelas, mas não popula. Para carregar usuários/cursos de demonstração, rode o seed uma vez a partir do **Shell** do serviço `tica-api` (aba **Shell** no dashboard — disponível em planos pagos) ou localmente apontando para o banco do Render:

```bash
# localmente, com DATABASE_URL = External Connection String do Render:
DATABASE_URL="postgresql://...render.com/tica" pnpm --filter @tica/database run seed
```

Usuários do seed (senha `ChangeMe!123` — **troque em produção**): `admin@thinkit.academy`, `gestor@thinkit.academy`, `analista@thinkit.academy`.

---

## Migrations vs. db push

Este guia usa `prisma db push` (sincroniza o schema direto, sem histórico) para subir rápido. Para um fluxo de produção com histórico e rollback, gere migrations e troque o comando de build:

```bash
# uma vez, localmente:
pnpm --filter @tica/database exec prisma migrate dev -n init
git add packages/database/prisma/migrations && git commit -m "feat: migrations"
```

No `render.yaml`, troque `prisma db push --skip-generate` por `prisma migrate deploy`.

---

## Redis e Storage (opcionais)

- **Redis:** a app **não** exige Redis no boot. Para cache/filas/ranking em escala, crie um **Render Key Value** (Redis) e defina `REDIS_URL`.
- **Storage de mídia:** o provider padrão serve mídia pela própria API (URLs assinadas HMAC), suficiente para começar. Para produção, use um bucket externo (S3/R2/Azure Blob) e implemente o provider correspondente (ver `apps/api/src/storage/storage.service.ts`), definindo `STORAGE_*`.

---

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Build falha em `nest: not found` / `tsc: not found` | devDependencies não instaladas | garanta `pnpm install --prod=false` no build |
| App inicia mas Render marca *unhealthy* | não escutou em `$PORT` | a API já usa `PORT`; o web usa `-p $PORT` no start |
| `Cannot find module '@tica/database'` em runtime | pacote não compilado | o build roda `pnpm --filter @tica/database run build` antes da API |
| Login não persiste / 401 após login | cookie cross-site bloqueado | `COOKIE_SAMESITE=none` na API + `WEB_ORIGIN` correto (ou domínio próprio) |
| Frontend chama `localhost:3333` | `NEXT_PUBLIC_API_URL` errado no build | defina a URL da API e **redeploy** do web (é inlinado no build) |
| `P1001 can't reach database` | `DATABASE_URL` ausente/errada | use a Internal Connection String; mesmo region do serviço |
| Primeira resposta lenta | plano free hiberna | normal no free; use plano pago para evitar cold start |
