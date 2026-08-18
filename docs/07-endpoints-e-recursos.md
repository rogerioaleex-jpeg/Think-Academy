# Inventário consolidado — endpoints e recursos

Documento de referência do estado atual da plataforma. Serve como mapa único do que existe: os endpoints da API, as rotas do frontend e a cobertura em relação ao PRD.

## Rotas do frontend (Next.js)

Públicas: `/login` e `/verify/[publicId]` (validação de certificado). O restante fica sob o route group autenticado `(app)`, que aplica a guarda de sessão e injeta a sidebar + barra superior (busca global + notificações).

| Rota | Descrição |
|---|---|
| `/dashboard` | Visão do aluno: XP, progresso, competências, conquistas e trilha recomendada |
| `/courses` · `/courses/[id]` | Catálogo e detalhe do curso com player de vídeo (signed URL) e progresso |
| `/labs` · `/labs/[slug]` | Catálogo e console do lab (iniciar/reset/destruir, desafios, hints) |
| `/exams` · `/exams/[id]` | Lista de simulados e execução da prova com resultado |
| `/leaderboard` | Ranking global e mensal |
| `/achievements` | Catálogo de badges com estado conquistado/bloqueado |
| `/competencies` | Radar de competências do aluno |
| `/certificates` | Certificados do aluno |
| `/manager` | Dashboard do gestor: overview, matriz de competências e avaliação |
| `/admin` · `/admin/courses` · `/admin/questions` · `/admin/labs` | Painel administrativo |
| `/search` | Resultados da busca global |

## Endpoints da API (prefixo `/api`)

Autenticação e conta: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all` (encerra todas as sessões), `GET /auth/me`, `GET /users`, `GET /users/:id`, `GET /users/me/profile`. A sessão usa **cookies httpOnly** (access token de 15 min + refresh token rotativo de 7 dias) — o `login`/`register` definem os cookies e retornam `{ user }` (o token não vai no corpo); `refresh` rotaciona; `logout` revoga e limpa os cookies.

LMS: `GET /courses`, `GET /courses/admin/all`, `GET /courses/:id`, `POST /courses`, `PATCH /courses/:id`, `POST /courses/:id/publish`, `DELETE /courses/:id`, `POST /courses/:id/modules`, `POST /courses/modules/:moduleId/lessons`, `POST /courses/:id/enroll`, `POST /courses/lessons/:lessonId/progress`. Categorias: `GET /categories`, `POST /categories`.

Vídeos e storage: `GET /videos/:id/playback` (signed URL), `POST /videos`, `GET /videos/upload-target`, `GET /storage/stream` (mediador com token assinado).

Trilhas: `GET /learning-paths`, `GET /learning-paths/:slug`, `POST /learning-paths/:id/enroll`, `GET /learning-paths/:id/progress` (ao chegar a 100% credita XP e emite certificado).

Provas: `GET /exams`, `POST /exams/:id/start`, `POST /exams/attempts/:attemptId/submit`. Admin de provas/questões: `GET /admin/exams/questions`, `POST /admin/exams/questions`, `POST /admin/exams`, `POST /admin/exams/:id/questions`, `POST /admin/exams/questions/import` (CSV), `POST /admin/exams/import-to-exam` (CSV cria a prova).

Gamificação: `GET /leaderboard`, `GET /badges`.

Competências: `GET /competencies`, `GET /competencies/me`, `GET /competencies/me/gaps`, `GET /competencies/team/matrix`, `POST /competencies/assess`.

Labs: `GET /labs`, `GET /labs/:slug`, `POST /labs/:id/start`, `POST /labs/instances/:id/reset`, `POST /labs/instances/:id/destroy`, `POST /labs/instances/:id/submit`, `POST /labs/hints/:hintId/reveal`. Admin: `GET /admin/labs`, `POST /admin/labs`, `POST /admin/labs/:id/challenges`, `POST /admin/labs/:id/hints`.

Certificados: `GET /certificates`, `POST /certificates/issue`, `GET /verify/certificate/:publicId` (público).

Relatórios: `GET /reports/manager/overview`. Notificações: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`. Busca: `GET /search?q=`. Saúde: `GET /health`, `GET /ready`.

Documentação interativa completa (com schemas de request/response) em `/api/docs` (Swagger).

## Novos módulos (alinhamento com as telas do redesign)

Fórum Técnico: `GET /forum` (filtro `?category=`), `GET /forum/:id`, `POST /forum`, `POST /forum/:id/posts`, `POST /forum/:id/vote`, `POST /forum/posts/:id/vote`.

SOC Simulator: `GET /soc-sim/queue`, `GET /soc-sim/live`, `GET /soc-sim/incidents/:id` (sem gabarito), `POST /soc-sim/incidents/:id/start`, `POST /soc-sim/attempts/:attemptId/submit` (calcula o SOC Analyst Score: detecção, investigação, KQL, MITRE, documentação, decisão + overall; credita XP se ≥70).

Detection Engineering: `GET /detection`, `GET /detection/:id` (logs sintéticos), `POST /detection/:id/submit` (avaliador heurístico de KQL → events matched / TP / FP / Detection Score / MITRE; credita XP se passar).

Relatórios executivos: `GET /reports/roi`, `GET /reports/talent`, `GET /reports/talent/report` (exportação), `GET /reports/analyst/:id` (perfil técnico detalhado do gestor), `GET /reports/soc-live`.

> **Migração necessária:** estes recursos adicionam tabelas (forum_threads, forum_posts, incidents, incident_attempts, detection_challenges, detection_submissions) e enums (IncidentSeverity, IncidentStatus, IncidentVerdict). Rode `pnpm db:generate && pnpm --filter @tica/database migrate && pnpm db:seed` para criar e popular.

## Módulos do backend

`PrismaModule`, `StorageModule`, `AuthModule`, `UsersModule`, `CoursesModule`, `VideosModule`, `ExamsModule`, `GamificationModule`, `LearningPathsModule`, `CompetenciesModule`, `LabsModule`, `CertificatesModule`, `CategoriesModule`, `ReportsModule`, `NotificationsModule`, `JobsModule`, `SearchModule`, `HealthModule`.

## Jobs agendados

A cada minuto destrói instâncias de lab expiradas; a cada 10 minutos emite certificados pendentes de trilhas concluídas; a cada hora recalcula o snapshot do ranking global. Em produção com múltiplas réplicas, proteja com lock distribuído (Redis).

## Cobertura vs. PRD

Núcleo completo e funcional ponta a ponta (backend + frontend): autenticação e RBAC, LMS com player e progresso, banco de questões e engine de provas, gamificação (XP/badges/ranking), trilhas, Competency Engine (radar, matriz, gaps e recomendação), laboratórios isolados com console e CRUD administrativo, certificados com emissão automática e verificação pública com QR, relatórios do gestor, notificações, busca global e jobs agendados.

Fases futuras (arquitetura preparada, ainda não implementadas): SSO real com Microsoft Entra ID (há stub e o modelo de dados já contempla `externalId`), demais telas administrativas de CRUD que hoje são acessadas via Swagger, deploy gerenciado em Azure/AKS com observabilidade, e o AI Tutor.

## Verificação

Todos os arquivos TypeScript/TSX passam por checagem de sintaxe e todos os JSON são válidos. A validação de tipos com o Prisma Client gerado e o build completo devem ser executados no ambiente do usuário (`pnpm install && pnpm db:generate`), pois o download dos binários do Prisma é bloqueado no ambiente de construção deste scaffold.
