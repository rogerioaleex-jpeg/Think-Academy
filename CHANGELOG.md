# Changelog

Registro do que foi construído neste scaffold, por rodada de trabalho.

## Fundação

Monorepo pnpm + Turborepo (apps `web`/`api`, packages `database`/`types`/`config`), Docker Compose (PostgreSQL, Redis, MinIO, API, Web) e os 6 documentos de fundação em `docs/`. Schema Prisma completo cobrindo todos os domínios (RBAC, LMS, trilhas, provas, labs, gamificação, competências, certificados, notificações, auditoria) com seed contendo usuários, cursos, a trilha SOC Analyst N1, 3 labs sintéticos, badges e 30 questões originais de treinamento (AZ-900, SC-900, Security+). Backend NestJS com auth JWT + RBAC, storage abstraído com URLs assinadas, orquestrador de labs isolados (driver Docker) e Swagger. Frontend Next.js com login, dashboard, ranking, execução de prova e radar de competências.

## Segunda rodada — telas e superfícies

Backend: categorias, admin de questões/provas (incluindo import CSV), listagem administrativa de cursos, relatórios do gestor e notificações. Frontend: detalhe do curso com player de vídeo consumindo signed URL e reportando progresso; dashboard do gestor com matriz de competências e formulário de avaliação; painel admin funcional de cursos e banco de questões; certificados do aluno e página pública de verificação com QR Code; console dos labs com desafios e hints.

## Terceira rodada — automação e conquistas

Jobs agendados (`@nestjs/schedule`): limpeza de instâncias de lab expiradas, emissão de certificados pendentes e recomputo do ranking. Emissão automática de certificado + XP de conclusão ao finalizar uma trilha, com notificação. CRUD de labs no admin (criar lab, desafios com flag em hash, hints). Tela de conquistas (badges) do aluno.

## Quarta rodada — descoberta

Busca global (`/search`) sobre cursos, trilhas, aulas, labs e questões. Barra superior no shell com campo de busca e sino de notificações (contador de não lidas + dropdown). Importação CSV que cria a prova e anexa as questões em um passo.

## Repaginação (Cyber Intelligence Framework)

Adoção do design system do redesign feito no Stitch: tipografia **Inter + JetBrains Mono**, ícones de linha em SVG inline (sem dependência de fonte externa), sidebar dark agrupada por seções (Aprender / Progresso / Gestão / Admin) com indicador lime no item ativo, e refino de tokens (primário teal profundo `#005b58`, container `#277471`, lime `#C8D541`). Aplicado no protótipo (todas as telas) e no frontend real (fontes, tokens, `globals.css`, `Sidebar`, novo componente `Icon`).

Páginas novas (protótipo + rotas reais no monorepo): **ROI & Custos** (executivo), **Gestão de Talentos** (SOC Team Competency), **Atribuição em massa**, **Central de Notificações**, **Configurações de Segurança** e **SOC Live Monitoring**. Backend correspondente: `GET /reports/roi`, `GET /reports/talent`, `GET /reports/soc-live`, `POST /courses/:id/bulk-assign`, `GET/PUT /admin/security-settings`.

## Fidelidade total ao protótipo aprovado

Para o app Next ficar **idêntico** ao HTML aprovado (`preview/think-it-cyber-academy.html`), o CSS e as funções de render do protótipo passaram a ser a fonte única de layout: extraídos para `apps/web/src/app/proto.css` e `apps/web/src/lib/proto.js`. A casca (`ProtoShell`) reproduz sidebar + topbar do protótipo, e cada rota renderiza a "view" correspondente via `ProtoView` (markup/estilo idênticos). Rotas cobertas: dashboard, cursos (+detalhe), labs (+console), SOC Simulator (fila + workspace com abas), SOC Live, Detection Eng., avaliações (+execução), ranking, conquistas, competências, Cyber Passport, certificados (+verificação), notificações, gestor, gestão de talentos, ROI & custos, atribuição em massa, administração e segurança. Verificado por render headless: dashboard, ROI e SOC Live batem pixel a pixel com o protótipo.

## Adoção direta do design Stitch (Cyber Intelligence Framework)

O protótipo e o app passaram a usar o **HTML/CSS do próprio Stitch** como fonte de layout, não recriações. Cada tela polida do pacote Stitch (labs, console de investigação, SOC fila, SOC live, simulado, ranking, conquistas, passport, detalhe do curso, notificações, segurança, atribuição em massa, gestor/líder, talentos, ROI, perfil detalhado, relatório executivo, fórum) foi embutida como `<main>` em `apps/web/src/lib/proto.js` (objeto `STITCH`). O Tailwind com os tokens do Stitch foi **compilado para CSS estático** (`apps/web/src/app/tailwind-stitch.css`) — sem depender de CDN — e a sidebar dark "Elite Operator" (com CTA Start Lab) é gerada por `buildSidebar()`. `ProtoShell` monta a casca e `ProtoView` injeta a view por rota. Verificado por render headless (ROI, ranking, labs, gestor, SOC live) com layout fiel ao Stitch.

## Consolidação

Cross-check de todas as chamadas de API do frontend contra as rotas do backend (100% conciliadas), inventário consolidado em `docs/07-endpoints-e-recursos.md`, este changelog e verificação final de sintaxe (todos os arquivos TS/TSX) e de JSON.

## Endurecimento de segurança

Auditoria de segurança (sem SQL injection — tudo via Prisma parametrizado), DTOs com `class-validator` em todos os endpoints, `helmet` + limites de payload, e enforcement de segredo forte de JWT (`common/secret.ts`). Documentado em `SECURITY.md`.

Autenticação migrada de token no `localStorage` para **cookies httpOnly + Secure + SameSite** com **refresh token rotativo** (hash SHA-256 no banco; modelo `RefreshToken`): `POST /auth/refresh` (rotação), `/auth/logout` e `/auth/logout-all` (revoga todas as sessões). **Content-Security-Policy explícita** no `helmet` (API) e nos headers do Next (`frame-ancestors 'none'`, nosniff, Referrer/Permissions-Policy, HSTS). Job diário de limpeza dos refresh tokens expirados/revogados.

## Prontidão para produção (qualidade e operação)

Fundação de **testes com Jest** na API cobrindo auth (rotação/revogação de refresh token, login, logout global), validação do segredo do JWT, validação de ambiente e curva de gamificação. **CI** (GitHub Actions) com Postgres de serviço: install → prisma generate/migrate → lint → typecheck → test → build, mais job de `pnpm audit`; **Dependabot** para deps e actions. Robustez da API: **filtro global de exceções** (envelope de erro consistente, sem vazar 5xx em produção), **request-id** + **log estruturado** por requisição, **validação de variáveis de ambiente no boot** e readiness com **503** quando o banco cai. Ferramentas de padrão de código: ESLint, Prettier, EditorConfig, `.nvmrc` e scripts `lint`/`typecheck`/`test`/`format` na raiz.

## Deploy no Render

Blueprint `render.yaml` (PostgreSQL + API + web) e guia `docs/08-deploy-render.md`. Ajustes de produção: API escuta em `PORT` (injetada pelo Render) em `0.0.0.0`; pacote `@tica/database` agora é **compilado** (`main` → `dist/index.js`, script `build` com `prisma generate && tsc`), corrigindo `node dist/main.js` em produção; web bindando em `$PORT`. Documentados cookies cross-site (`SameSite=none` em subdomínios `onrender.com` ou domínio próprio com `SameSite=lax`), seed, migrations vs. `db push`, e a limitação de que os labs (Docker) não rodam em web services gerenciados.
