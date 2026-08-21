# Plano de implementação

A plataforma é grande demais para ser construída de uma vez. O plano abaixo entrega valor de forma incremental, priorizando o núcleo que forma analistas (LMS + provas + gamificação + Competency Engine) antes dos laboratórios mais complexos — como recomendado no próprio PRD. Cada fase é utilizável por si só.

## O que este scaffold já entrega

Este repositório é o ponto de partida da Fase 1 estendido: o modelo de dados **completo** (todos os domínios), o backend com os módulos do núcleo e endpoints reais documentados no Swagger, a camada de storage com URLs assinadas, o orquestrador de labs isolados com driver Docker, o Competency Engine (radar, matriz, gaps) e um frontend com login e dashboard funcionais. As telas administrativas de CRUD e alguns fluxos de aluno estão estruturados para serem preenchidos nas fases seguintes, consumindo os endpoints que já existem.

Estado por área:

| Área | Backend | Frontend |
|---|---|---|
| Auth + RBAC | Completo | Login funcional |
| Usuários / perfil | Completo | Dashboard funcional |
| Cursos / módulos / aulas / progresso | Completo | Listagem + detalhe + player com signed URL |
| Vídeos + signed URLs | Completo | Player integrado + registro no admin |
| Provas / simulados | Completo | Execução funcional + banco de questões (admin) |
| Gamificação (XP/badges/ranking) | Completo | Ranking + dashboard |
| Trilhas | Completo | Listagem |
| Competency Engine | Completo | Radar + recomendação + matriz do gestor |
| Labs (orquestrador isolado) | Completo + CRUD admin | Console + admin (criar lab/desafios/hints) |
| Certificados | Completo + emissão automática | Lista do aluno + verificação pública com QR |
| Admin | Endpoints prontos | Cursos, questões e labs funcionais; demais via API |
| Gestor (relatórios) | Completo | Dashboard com overview, matriz e avaliação |
| Gamificação / Conquistas | Completo | Ranking + tela de conquistas (badges) |
| Categorias / Notificações | Completo | (consumido pelas telas) |
| Jobs agendados | Completo | limpeza de labs · auto-certificado · ranking |

## Roadmap por fases

**Fase 1 — Fundação.** Autenticação, usuários, RBAC, layout e dashboard. *(coberto neste scaffold)*

**Fase 2 — LMS.** Cursos, módulos, aulas, upload e player de vídeo com signed URLs, materiais/biblioteca, progresso e retomada. *(backend pronto; falta o painel de upload e o player completo)*

**Fase 3 — Avaliação.** Banco de questões, quizzes, engine de provas/simulados, resultados com explicações e importação de questões por CSV. *(engine pronta; falta o CRUD administrativo e o CSV)*

**Fase 4 — Gamificação.** XP, badges, achievements e ranking (geral, mensal, por trilha, por competência). *(núcleo pronto; falta o board por competência e a tela de conquistas)*

**Fase 5 — Trilhas, competências e certificados.** Learning paths completos, matriz de competências para gestores, dashboard do gestor com gaps e emissão/validação de certificados com QR Code. *(Competency Engine e certificados prontos no backend; faltam as telas de gestor e o QR Code)*

**Fase 6 — Cyber Labs.** Orquestrador de labs, isolamento por rede Docker, desafios, hints e validação; primeiros SOC Labs sintéticos. *(orquestrador e driver Docker prontos; console noVNC real e driver de VM completa — Windows 10/Ubuntu Desktop — implementados; pendente: host dedicado com KVM em produção e hardening de rede adicional — ex. "Lab Agent"/mTLS em vez de Docker remoto exposto — para operar em escala)*

**Fase 7 — Gestão.** Dashboard do gestor, relatórios e analytics; filtros por equipe, analista, período, trilha e competência.

**Fase 8 — Corporativo.** SSO com Microsoft Entra ID, deploy em Azure (AKS ou Container Apps) e observabilidade (logs, métricas, health checks).

**Fase futura — IA.** AI Tutor: responder dúvidas, explicar questões, recomendar trilhas, identificar gaps e gerar exercícios — reutilizando os sinais do Competency Engine, com a diretriz de nunca fornecer instruções para atacar sistemas reais.

## Critério de sucesso do MVP

O MVP estará completo quando um administrador conseguir criar usuário, curso, módulo, aula, vídeo, material, quiz, prova, trilha e lab; e um aluno conseguir logar, assistir vídeo com progresso registrado, responder quiz e prova, ganhar XP e badge, ver o ranking, iniciar e resetar um lab seguro, e receber um certificado ao concluir uma trilha. Os endpoints para todos esses passos já existem; o trabalho restante do MVP é concentrar as telas administrativas e o player de vídeo.
