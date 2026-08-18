# Estrutura de diretórios

O projeto é um monorepo gerenciado por **pnpm workspaces** + **Turborepo**. Aplicações ficam em `apps/`, código compartilhado em `packages/` e artefatos de infraestrutura em `infrastructure/`.

```
think-it-cyber-academy/
├── package.json                # workspace raiz (scripts orquestradores)
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml          # postgres · redis · minio · api · web
├── .env.example
│
├── docs/                       # documentos de fundação
│   ├── 01-architecture.md
│   ├── 02-directory-structure.md
│   ├── 03-database-schema.md
│   ├── 04-main-flows.md
│   ├── 05-implementation-plan.md
│   └── 06-deployment.md
│
├── packages/
│   ├── database/               # Prisma: schema, client e seed
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # modelo de dados completo
│   │   │   └── seed.ts          # dados iniciais + questões originais
│   │   └── src/index.ts         # PrismaClient singleton (@tica/database)
│   ├── types/                  # tipos compartilhados (reservado)
│   └── config/                 # config compartilhada (reservado)
│
├── apps/
│   ├── api/                    # NestJS (backend)
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── main.ts          # bootstrap + Swagger + CORS + pipes
│   │       ├── app.module.ts
│   │       ├── prisma/          # PrismaModule/Service
│   │       ├── common/          # decorators e guards (RBAC, JWT, @Public)
│   │       ├── auth/            # login, registro, JWT strategy, stub OIDC
│   │       ├── users/          # perfil do aluno, listagem
│   │       ├── courses/        # cursos, módulos, aulas, progresso
│   │       ├── videos/         # metadados + playback assinado
│   │       ├── storage/        # abstração de object storage + signed URLs
│   │       ├── exams/          # engine de provas/simulados
│   │       ├── gamification/   # XP, badges, ranking
│   │       ├── learning-paths/ # trilhas
│   │       ├── competencies/   # Competency Engine (radar, matriz, gaps)
│   │       ├── labs/           # orquestrador de labs + drivers
│   │       │   └── drivers/     # ILabDriver + DockerLabDriver
│   │       ├── certificates/   # emissão + verificação pública
│   │       └── health/         # /health e /ready
│   │
│   └── web/                    # Next.js (frontend)
│       ├── Dockerfile
│       ├── tailwind.config.ts
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx           # redireciona para /dashboard
│           │   ├── login/page.tsx
│           │   └── (app)/             # rotas autenticadas (com sidebar)
│           │       ├── layout.tsx      # shell + guarda de rota
│           │       ├── dashboard/
│           │       ├── courses/
│           │       ├── labs/
│           │       ├── exams/
│           │       │   └── [id]/       # execução de prova
│           │       ├── leaderboard/
│           │       ├── competencies/
│           │       └── admin/
│           ├── components/            # ui.tsx, sidebar.tsx
│           └── lib/api.ts             # cliente HTTP + token
│
└── infrastructure/
    ├── docker/
    ├── kubernetes/
    └── terraform/
```

## Convenções

Cada módulo da API segue o mesmo padrão: um `*.module.ts` que declara providers e controllers, um `*.service.ts` com a regra de negócio, um `*.controller.ts` com as rotas anotadas para Swagger e uma pasta `dto/` com os objetos de entrada validados. O pacote `@tica/database` é a única fonte do cliente Prisma e é importado por qualquer módulo que precise de acesso a dados, o que evita múltiplas instâncias do client. No frontend, todo acesso à API passa por `lib/api.ts`, e as páginas autenticadas vivem sob o route group `(app)`, que aplica a guarda de sessão e injeta a sidebar.
