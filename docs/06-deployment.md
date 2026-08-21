# Deployment

## Desenvolvimento local

O caminho mais rápido usa Docker Compose, que sobe PostgreSQL, Redis e MinIO. Depois basta gerar o client Prisma, aplicar as migrations e rodar o seed.

```bash
cp .env.example .env
docker compose up -d postgres redis minio     # dependências
pnpm install
pnpm db:generate                               # gera o Prisma Client
pnpm --filter @tica/database migrate            # cria as tabelas
pnpm db:seed                                   # popula dados iniciais
pnpm api:dev                                   # API em http://localhost:3333
pnpm web:dev                                   # Web em http://localhost:3000
```

A API expõe o Swagger em `http://localhost:3333/api/docs`. Usuários do seed: `admin@thinkit.academy`, `gestor@thinkit.academy` e `analista@thinkit.academy`, todos com a senha `ChangeMe!123` (trocar em qualquer ambiente que não seja local).

Para subir tudo containerizado, incluindo API e Web, use `docker compose up --build`.

## Object storage

Em dev, o MinIO responde como um endpoint S3-compatível em `http://localhost:9000` (console em `:9001`). Basta criar o bucket definido em `STORAGE_BUCKET`. Em produção, ajuste `STORAGE_PROVIDER` para `azure`, `s3` ou `r2` e forneça as credenciais correspondentes; a aplicação troca de provedor por configuração, sem alteração de código. Para o cenário corporativo Think IT, a recomendação é **Azure Blob Storage + Azure CDN/Front Door**.

## Produção (Azure)

O alvo recomendado é o Azure. O banco vai para **Azure Database for PostgreSQL**; a mídia para **Azure Blob Storage** com CDN à frente; o Redis para **Azure Cache for Redis**. A API e o Web podem rodar em **Azure Container Apps** (mais simples) ou **AKS** (mais controle, indicado quando o plano de labs em Kubernetes entrar). As imagens são construídas pelos `Dockerfile` de cada app e publicadas no Azure Container Registry.

Checklist de produção: definir um `JWT_SECRET` forte e único; habilitar TLS ponta a ponta; restringir o CORS ao domínio real via `WEB_ORIGIN`; rodar `prisma migrate deploy` no pipeline de deploy; configurar os endpoints `/health` e `/ready` como liveness/readiness probes; e centralizar logs e métricas.

## Plano de laboratórios em produção

O plano de labs **não** compartilha rede com a aplicação. Em Kubernetes, cada lab roda em namespace dedicado com `NetworkPolicy` de negação padrão (deny-all) e sem egress para redes internas — o equivalente à rede `--internal` do Docker em dev. O driver correspondente implementa a mesma interface `ILabDriver`. O job de limpeza de instâncias expiradas deve rodar como CronJob. Nunca exponha os labs diretamente à internet ou à rede corporativa; o acesso do aluno passa por um gateway controlado.

### VMs completas (Windows 10 / Ubuntu) — host dedicado com KVM

Diferente dos containers CTF (que já rodam bem em qualquer host Docker), as VMs completas provisionadas pelo `VmLabDriver` (Windows 10 via QEMU, Ubuntu Desktop) exigem um **host dedicado com virtualização de hardware habilitada** (`/dev/kvm` acessível) — o Render, que hospeda `apps/api`/`apps/web`, não suporta isso. A configuração recomendada:

- Um servidor Linux dedicado (fora do Render) com KVM, Docker instalado e `dockerd` exposto em TCP com **TLS mútuo** (`--tlsverify`) — a API se conecta a ele via `DOCKER_HOST=tcp://<host>:2376`, `DOCKER_TLS_VERIFY`, `DOCKER_CERT_PATH`, reaproveitando 100% do padrão de driver já existente (sem microsserviço adicional).
- A rede `tica-labs-isolated` (`internal: true`) hospeda só as VMs, sem rota de saída. Ver `infra/labs/` para o compose declarativo desse host e `docs/01-architecture.md` para a diferença de postura de segurança do `VmLabDriver` em relação ao driver Docker.
- Expor o console noVNC de cada VM exige `LAB_VM_ACCESS_MODE=traefik-labels` (padrão) — validamos ao vivo que redes Docker `internal: true` simplesmente não publicam portas, então esse é o único modo capaz de gerar um `accessUrl` real sem abrir mão do isolamento, além de resolver o mixed content (já que `apps/web` roda em HTTPS e um iframe `http://` seria bloqueado). Um Traefik nesse host, com uma pata na rede isolada e outra numa rede com saída, um domínio wildcard (`LAB_PUBLIC_DOMAIN`) e certificado Let's Encrypt automático, expõe cada instância em `https://lab-<instanceId>.<LAB_PUBLIC_DOMAIN>/`.
- Windows 10 usa a ISO de avaliação oficial da Microsoft (trial de 90 dias) — a instância é sempre efêmera; nunca ofereça uma VM Windows "permanente" para um aluno.

## Migrations

As migrations são versionadas pelo Prisma. Em desenvolvimento, `prisma migrate dev` cria e aplica; em produção, `prisma migrate deploy` aplica o que já foi versionado. O `prisma generate` roda no build da imagem da API para gerar o client compatível com o ambiente de execução.
