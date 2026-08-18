# Fluxos principais

Este documento descreve os fluxos de negócio mais importantes e como eles atravessam a aplicação. Todos os caminhos de API usam o prefixo `/api`.

## Autenticação (e-mail/senha)

O aluno envia credenciais para `POST /api/auth/login`. A API busca o usuário, compara a senha com o hash bcrypt, atualiza `lastLoginAt` e emite um JWT contendo o `sub` (id), o e-mail e os papéis. O frontend guarda o token e o envia como `Bearer` nas chamadas seguintes. Rotas protegidas passam pelo `JwtAuthGuard` global (exceto as marcadas com `@Public()`), e o `RolesGuard` valida os papéis exigidos pelo `@Roles(...)`.

```
Login → valida senha → assina JWT(sub, email, roles) → cliente guarda token
Requests → Bearer token → JwtAuthGuard → RolesGuard → handler
```

## SSO com Microsoft Entra ID (fase futura)

```
Usuário → "Entrar com conta corporativa" → Entra ID (OIDC)
       → id_token → API valida assinatura/claims
       → encontra ou cria User por externalId (subject)
       → emite o MESMO JWT interno → segue o fluxo normal
```

O endpoint atual (`oidcLoginStub`) documenta o ponto de extensão; a implementação real valida o `id_token` do Entra e reaproveita toda a autorização já existente.

## Entrega de vídeo com URL assinada

Vídeo nunca é servido por URL pública permanente. Quando o player pede a reprodução em `GET /api/videos/:id/playback`, a API confirma que o usuário tem acesso ao conteúdo, então o `StorageService` gera uma URL assinada com HMAC e prazo curto (`STORAGE_SIGNED_URL_TTL`, padrão 900s). O player recebe essa URL; ao expirar, ela deixa de funcionar.

```
Usuário autenticado → tem acesso ao curso? → SIM
   → StorageService.getSignedDownloadUrl(key, ttl)
   → player recebe URL temporária → conteúdo
```

Em produção, o `StorageService` é trocado por presigned URLs nativas (S3/R2 via `@aws-sdk/s3-request-presigner`, Azure via SAS), mantendo a mesma interface.

## Progresso de aula e XP

Ao assistir uma aula, o cliente reporta o progresso em `POST /api/courses/lessons/:lessonId/progress` com o percentual assistido e a posição de retomada. Quando o percentual cruza 90%, a aula é marcada como concluída, o XP da aula é creditado (idempotente) e o progresso do curso é recalculado. Se o curso chegar a 100%, o `Enrollment` vira `COMPLETED` e as regras de badge são reavaliadas.

## Prova / simulado

```
POST /api/exams/:id/start
   → valida tentativas máximas
   → sorteia questões (randomize) e embaralha alternativas
   → devolve enunciado SEM o gabarito
   → cria ExamAttempt com expiresAt (duração)

POST /api/exams/attempts/:attemptId/submit
   → corrige comparando com as alternativas corretas
   → calcula nota, define aprovado/reprovado
   → persiste ExamAnswer, marca a tentativa como GRADED
   → se aprovado, credita XP (idempotente por prova)
   → devolve resultado + explicações por questão
```

A correção acontece inteiramente no servidor; o gabarito nunca trafega para o cliente antes do envio.

## Ciclo de vida do laboratório

```
POST /api/labs/:id/start
   → reaproveita instância ativa, se houver
   → cria LabInstance (PROVISIONING) com expiresAt
   → DockerLabDriver.provision():
        garante a rede isolada (--internal)
        sobe container com quotas + cap-drop + read-only
   → atualiza para RUNNING (externalRef, accessUrl)

POST /api/labs/instances/:id/submit
   → hash(answer) comparado ao flagHash (server-side)
   → se correto, credita XP do desafio (idempotente)

POST /api/labs/instances/:id/reset     → destrói e reprovisiona
POST /api/labs/instances/:id/destroy   → destrói e marca DESTROYED

Job de limpeza (agendado)
   → instâncias com expiresAt vencido → destroy → status EXPIRED
```

A garantia de isolamento (sem rota para a rede corporativa) e a destruição automática por expiração são requisitos de segurança, não opcionais.

## Competency Engine: gaps e trilha recomendada

O gestor avalia competências em `POST /api/competencies/assess`. O aluno consulta seu radar em `GET /api/competencies/me` e sua recomendação em `GET /api/competencies/me/gaps`. A recomendação identifica as competências abaixo do limiar (65%), mapeia cada gap para categorias de conteúdo e monta uma lista ordenada de cursos, labs e simulados para fechar aquelas lacunas. O gestor vê a equipe inteira pivotada em `GET /api/competencies/team/matrix`.

```
Perfil do analista:  SIEM 82% · KQL 71% · IR 58% · Cloud 42%
   → gaps: Incident Response, Cloud (abaixo de 65%)
   → trilha recomendada: cursos + labs + simulados dessas áreas
   → após concluir: reavaliação eleva os percentuais
```

## Certificação

```
Trilha concluída → POST /api/certificates/issue (admin ou automático)
   → gera publicId TICA-<TRILHA>-<ANO>-<SEQ>
Validação pública → GET /api/verify/certificate/:publicId
   → retorna apenas nome, título, carga horária e data (mínimo necessário)
```
