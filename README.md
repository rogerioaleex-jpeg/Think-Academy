# Think IT Cyber Academy

Plataforma corporativa de treinamento em Cybersecurity — LMS, trilhas, provas/simulados, gamificação, laboratórios práticos isolados, motor de competências e certificação interna. Pilares: **Aprender → Praticar → Avaliar → Evoluir**.

> Monorepo com **Next.js** (web), **NestJS** (API), **Prisma/PostgreSQL** (dados), storage S3-compatível e orquestração de labs em rede isolada.

## Documentação

Comece pelos documentos de fundação em [`docs/`](docs/):

1. [Arquitetura](docs/01-architecture.md)
2. [Estrutura de diretórios](docs/02-directory-structure.md)
3. [Modelo de dados](docs/03-database-schema.md)
4. [Fluxos principais](docs/04-main-flows.md)
5. [Plano de implementação](docs/05-implementation-plan.md)
6. [Deployment](docs/06-deployment.md)
7. [Inventário de endpoints e recursos](docs/07-endpoints-e-recursos.md) — mapa único do que existe
8. [Deploy no Render](docs/08-deploy-render.md) — Blueprint `render.yaml` + passo a passo
9. [CHANGELOG](CHANGELOG.md) — o que foi construído, por rodada

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres redis minio   # dependências
pnpm install
pnpm --filter @tica/database build           # gera o Prisma Client + compila o pacote (dist)
pnpm --filter @tica/database migrate          # cria as tabelas
pnpm db:seed                                 # popula dados iniciais
pnpm api:dev                                 # API  → http://localhost:3333/api  (Swagger em /api/docs)
pnpm web:dev                                 # Web  → http://localhost:3000
```

Usuários do seed (senha `ChangeMe!123` — troque fora do ambiente local):

| Papel | E-mail |
|---|---|
| Admin | `admin@thinkit.academy` |
| Gestor | `gestor@thinkit.academy` |
| Aluno | `analista@thinkit.academy` |

## Qualidade, testes e operação

Scripts na raiz (via Turborepo): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, e `pnpm format` / `pnpm format:check` (Prettier). Padrões de código em `.eslintrc.cjs` / `.prettierrc` / `.editorconfig`; versão do Node em `.nvmrc`.

Testes com **Jest** na API (`pnpm --filter @tica/api test`): cobrem a lógica sensível de autenticação (rotação e revogação de refresh token, login, logout global), a validação do segredo do JWT, a validação de ambiente e a curva de gamificação. **CI** em GitHub Actions (`.github/workflows/ci.yml`) sobe um Postgres de serviço e roda install → prisma generate/migrate → lint → typecheck → test → build, além de um job de `pnpm audit`. **Dependabot** (`.github/dependabot.yml`) mantém dependências e actions atualizadas.

Observabilidade e robustez da API: **request-id** por requisição (header `x-request-id`, ecoado na resposta), **log estruturado** de cada requisição (método, rota, status, duração), **filtro global de exceções** com envelope de erro consistente que não vaza detalhes de 5xx em produção, **validação de variáveis de ambiente no boot** (falha rápido em produção mal configurada) e readiness (`/api/ready`) que retorna **503** quando o banco está indisponível. Detalhes de segurança em [`SECURITY.md`](SECURITY.md).

## Identidade visual

A interface segue a identidade da Think IT (extraída do book executivo): tema **claro**, **teal `#277471`** primário, **lime `#C8D541`** secundário, tinta escura `#21242B`, e acentos laranja `#E88A3A` / vermelho `#C03A3A`. Os tokens estão centralizados em `apps/web/tailwind.config.ts` e `apps/web/src/app/globals.css`. Padrões-chave: cabeçalho de seção com barra lime/teal + kicker em small-caps, cartões brancos com borda superior colorida, e cartões escuros de destaque com pills (Positivo/Atenção/Ação). Um protótipo visual navegável de todas as telas está em `preview/think-it-cyber-academy.html`.

## Stack

Frontend em Next.js (App Router) + TypeScript + Tailwind. Backend em NestJS + TypeScript com REST documentado por OpenAPI/Swagger. Dados em PostgreSQL via Prisma. Autenticação JWT com RBAC e preparação para SSO (Microsoft Entra ID). Storage abstraído (MinIO no dev; Azure Blob / S3 / R2 em produção) com URLs assinadas. Labs orquestrados por Docker em rede isolada, com interface pronta para Kubernetes/VM.

## Escopo deste scaffold

O modelo de dados é completo (todos os domínios). O backend traz os módulos do núcleo com endpoints reais; o frontend entrega login, dashboard, ranking, execução de prova e o radar de competências funcionais. Telas administrativas de CRUD e o player de vídeo são os próximos passos, consumindo os endpoints já existentes. Ver [plano de implementação](docs/05-implementation-plan.md) para o estado detalhado por área.

## Segurança dos labs

Os laboratórios rodam em rede Docker `--internal` (sem rota para a rede corporativa/internet), com `cap-drop ALL`, `no-new-privileges`, filesystem read-only, limites de CPU/memória/PIDs e destruição automática por expiração. Usam dados sintéticos e ambientes deliberadamente vulneráveis, voltados a defesa e investigação — a plataforma não oferece funcionalidades para atacar sistemas reais.

## Nota sobre conteúdo de certificações

Os simulados de AZ-900, SC-900 e Security+ usam **questões originais de treinamento**, escritas a partir dos objetivos públicos de cada certificação. Não são dumps nem bancos proprietários.
