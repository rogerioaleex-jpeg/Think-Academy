# Think IT Cyber Academy — Arquitetura

## Visão geral

A Think IT Cyber Academy é uma plataforma corporativa de treinamento em Cybersecurity que combina um LMS (cursos, vídeos, materiais e trilhas), uma engine de provas e simulados, gamificação, laboratórios práticos isolados, um motor de competências para gestão do SOC e emissão de certificados internos. O produto foi desenhado em torno de quatro pilares: **Aprender → Praticar → Avaliar → Evoluir**.

A arquitetura é modular e separa claramente três planos que têm ciclos de vida e requisitos de segurança muito diferentes: o **plano de aplicação** (API + banco), o **plano de mídia** (object storage para vídeos e materiais) e o **plano de laboratórios** (ambientes efêmeros e isolados). Manter esses planos desacoplados é o que permite escalar a plataforma sem transformar cada nova funcionalidade em um risco operacional.

## Diagrama de alto nível

```
                          THINK IT CYBER ACADEMY

   ┌──────────────┐        ┌───────────────────────────┐
   │   Next.js    │  HTTPS │        NestJS API          │
   │  (frontend)  │───────▶│  REST + OpenAPI (Swagger)  │
   └──────────────┘        │                            │
                           │  auth · users · courses    │
                           │  videos · exams · labs      │
                           │  gamification · competency  │
                           │  certificates               │
                           └───────┬─────────┬───────────┘
                                   │         │
                     ┌─────────────┘         └───────────────┐
                     ▼                                        ▼
             ┌───────────────┐                        ┌───────────────┐
             │  PostgreSQL   │                        │  Object Store │
             │  (Prisma ORM) │                        │ MinIO/S3/Blob │
             └───────────────┘                        └───────────────┘
                     │                                        ▲
                     │ Redis (cache/filas/ranking)            │ signed URLs
                     ▼                                        │
             ┌───────────────┐                                │
             │ Background Jobs│───────────────────────────────┘
             │ certs · cleanup│
             └───────┬────────┘
                     │ orquestra (rede isolada)
                     ▼
        ┌─────────────────────────────────────────────┐
        │            LAB PLANE (isolado)               │
        │  Lab Orchestrator → Docker / K8s / VM        │
        │  rede internal, sem rota para a rede corp    │
        └─────────────────────────────────────────────┘
```

## Componentes

O **frontend** é uma aplicação Next.js (App Router) com Tailwind, servida separadamente da API e comunicando-se apenas por HTTPS com tokens JWT. Ele não acessa banco nem storage diretamente; tudo passa pela API, o que concentra a autorização em um único ponto.

A **API** é um monólito modular em NestJS. Cada domínio (auth, cursos, provas, labs, gamificação, competências, certificados) é um módulo Nest independente com seu controller, service e DTOs. Essa organização mantém o código coeso e permite, no futuro, extrair um módulo para um serviço separado sem reescrever o resto. A autenticação usa JWT com estratégia Passport; a autorização é RBAC baseada em papéis, aplicada por guards globais.

O **PostgreSQL** é a fonte da verdade de todo o domínio de negócio, acessado via Prisma. O modelo de dados está detalhado em `03-database-schema.md`. Vídeos e arquivos **nunca** são guardados no banco — apenas seus metadados e a chave (`storageKey`) do objeto correspondente.

O **object storage** guarda os binários de vídeo e material. A aplicação fala com ele através de uma camada de abstração (`StorageService`), de modo que trocar MinIO (dev) por Azure Blob, S3 ou Cloudflare R2 (produção) é uma questão de configuração, não de reescrita. O acesso ao conteúdo é sempre mediado por **URLs assinadas e expiráveis** — nunca por URLs públicas permanentes.

O **Redis** (previsto para a fase de escala) cobre cache, filas de jobs, sessões quando necessário e o cálculo de ranking. Os **background jobs** cuidam de tarefas assíncronas: geração de certificados, processamento de vídeos, envio de notificações, cálculo do ranking e — criticamente — a limpeza de instâncias de laboratório expiradas.

## Isolamento de labs (requisito crítico de segurança)

O plano de laboratórios é o ponto mais sensível da plataforma. A regra inviolável é: **um ambiente de lab jamais pode alcançar a rede corporativa, sistemas reais ou dados de clientes.** A arquitetura materializa isso em camadas.

```
                    INTERNET / REDE CORPORATIVA
                              │
                              ✗  (sem rota)
                              │
                       ┌──────┴──────┐
                       │ LAB GATEWAY │  (único ponto de entrada controlado)
                       └──────┬──────┘
                              │
                       LAB NETWORK (docker network --internal)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          Container        Container         VM
          (target)         (Linux)        (Windows)
```

Cada instância roda em uma rede Docker marcada como `internal`, que por definição não tem gateway para fora. Os contêineres sobem com `--cap-drop ALL`, `--security-opt no-new-privileges`, filesystem `--read-only`, limites de CPU/memória e `--pids-limit` para conter fork bombs. Toda instância tem `expiresAt`; um job de limpeza destrói o que passou do prazo. O orquestrador é abstraído por uma interface (`ILabDriver`) com o driver Docker como implementação inicial e Kubernetes/VM previstos para escala. Os desafios usam **dados sintéticos** e ambientes deliberadamente vulneráveis, voltados a defesa e investigação — a plataforma não oferece funcionalidades para atacar sistemas reais.

## Segurança da aplicação

A postura de segurança segue o OWASP ASVS como referência. As senhas são armazenadas com bcrypt; os segredos vêm de variáveis de ambiente e nunca do código. A validação de entrada é feita por DTOs com `class-validator` e uma `ValidationPipe` global em modo whitelist, que rejeita campos não declarados. Há rate limiting global via `ThrottlerModule`. O acesso a mídia é sempre por URL assinada de curta duração. Ações administrativas são registradas em `audit_logs`. A autorização por papéis (`SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `MENTOR`, `MANAGER`, `ANALYST`, `STUDENT`) é aplicada declarativamente com o decorator `@Roles(...)` e o `RolesGuard`.

## Preparação para SSO (Microsoft Entra ID)

O modelo de usuário já contempla `externalId` e `passwordHash` opcional, de forma que uma conta possa existir apenas via SSO. O fluxo OIDC com o Entra ID está previsto como um provedor de autenticação adicional: validado o `id_token`, a API encontra ou cria o usuário pelo `externalId` (subject do OIDC) e emite o mesmo token interno usado hoje pelo login por e-mail/senha. Isso permite a experiência "Entre com sua conta corporativa" sem alterar o restante da autorização.

## Preparação para IA (fase futura)

A arquitetura reserva espaço para um AI Tutor que responderá dúvidas, explicará questões, recomendará trilhas e identificará gaps — reutilizando o Competency Engine já existente como fonte de sinais. Uma diretriz de segurança acompanha o recurso desde o desenho: a IA nunca deve fornecer instruções para atacar sistemas reais.
