# Modelo de dados

O schema completo vive em `packages/database/prisma/schema.prisma` (PostgreSQL + Prisma). Este documento explica as decisões por trás dele, agrupadas por domínio. Todas as tabelas usam `uuid` como chave primária e mapeiam para nomes em `snake_case` via `@@map`.

## RBAC e usuários

`User` é o centro do modelo. Guarda XP acumulado (`totalXp`) e `level` desnormalizados para leitura barata no dashboard, além de `externalId` e `passwordHash` opcional para suportar contas via SSO. Os papéis são modelados como uma relação n:n (`User` ↔ `Role` via `UserRole`), permitindo que um usuário seja, por exemplo, `ANALYST` e `STUDENT` ao mesmo tempo. `Permission` e `RolePermission` permitem, no futuro, uma autorização mais granular por permissão além do papel.

## LMS: cursos, módulos, aulas e mídia

A hierarquia de conteúdo é `Course → Module → Lesson`. Cada `Lesson` tem um `type` (vídeo, texto, material, quiz, lab, desafio) e ponteiros opcionais para o conteúdo específico daquele tipo: `videoId` (1:1 com `Video`), `examId` (um quiz) e `labId`. `Material` cobre PDFs, playbooks, cheat sheets e links, podendo pertencer a uma aula ou compor a biblioteca global. O ponto de design mais importante aqui: `Video` guarda apenas metadados e a `storageKey` do objeto — o binário vive no object storage, nunca no banco.

O progresso é rastreado em duas granularidades. `LessonProgress` registra o progresso por aula, incluindo `resumePositionSec`, que permite retomar o vídeo exatamente de onde o aluno parou. `Enrollment` agrega o progresso no nível do curso (`progressPct` e status). Ambos têm chave única por `(userId, …)` para garantir idempotência.

## Trilhas

`LearningPath` agrupa cursos numa jornada ordenada (`LearningPathCourse`, com `order` e `required`). `UserLearningPath` registra a matrícula e o progresso do aluno na trilha. O progresso da trilha é derivado da média do progresso dos cursos que a compõem.

## Provas e questões

O banco de questões (`Question` + `QuestionOption`) é independente das provas, o que permite reaproveitar questões e gerar provas dinamicamente. `Exam` define os parâmetros da avaliação: `kind` (quiz, prova, simulado, CTF), quantas questões sortear (`questionCount`), duração, nota mínima, tentativas máximas, e flags de randomização e embaralhamento. `ExamQuestion` liga o pool de questões à prova. Cada tentativa é um `ExamAttempt` com seus `ExamAnswer`. Guardar a resposta escolhida por questão permite feedback detalhado com explicações ao final.

## Laboratórios

`Lab` descreve o laboratório e seu ambiente: `driver` (Docker/K8s/VM), imagem, limites de CPU/memória, `timeoutMin` e portas expostas. `LabChallenge` são os objetivos verificáveis; a resposta esperada é guardada como `flagHash` — **a flag em texto nunca é persistida nem exposta**, a validação é sempre server-side. `LabHint` são dicas que podem custar XP. `LabInstance` é o ambiente efêmero provisionado para um usuário, com `status`, `externalRef` (id do container), `networkId` da rede isolada e `expiresAt`. `LabSubmission` registra cada tentativa de resposta a um desafio.

## Gamificação

`XpTransaction` é o livro-razão de XP. A constraint única `(userId, source, refId)` é o coração do anti-farming: a mesma atividade (ex.: concluir a mesma aula) só pode pontuar uma vez. O `totalXp` em `User` é a soma materializada dessas transações. `Badge`/`UserBadge` e `Achievement`/`UserAchievement` modelam conquistas. `LeaderboardEntry` guarda snapshots de ranking por escopo (global, mensal, por trilha, por competência) e período, recalculados por job.

## Competency Engine

`Competency` é o catálogo de competências (SIEM, KQL, Networking, etc.). `UserCompetency` registra o nível de um usuário numa competência (`level` de NONE a EXPERT, mais `scorePct` de 0 a 100 para o radar), junto com a evidência (`evidence`: avaliação de gestor, prova, lab, curso, certificação) e quem avaliou (`assessedById`). Essa estrutura é o que transforma a plataforma de "site de cursos" em ferramenta de gestão do SOC: permite montar a matriz de competências da equipe e derivar gaps e trilhas recomendadas.

## Certificados, notificações e auditoria

`Certificate` tem um `publicId` legível (ex.: `TICA-SOCN1-2026-0001`) usado na página pública de validação, e pode ser revogado. `Notification` cobre os avisos ao usuário. `AuditLog` registra ações administrativas (ator, ação, entidade, metadados, IP) para rastreabilidade.

## Extensibilidade

O modelo foi desenhado para ser configurável, não hard-coded: cursos, questões, provas, labs, badges, XP e trilhas são todos dados administráveis. Novos tipos de lab (Sentinel, Defender, Entra ID, KQL, Azure, AWS, Fortinet, EDR, DFIR, Threat Hunting, Detection Engineering, CTF) entram apenas como novos registros de `Lab` com o `driver` e a imagem apropriados, sem mudança de schema.
