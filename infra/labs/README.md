# Lab plane — host dedicado para VMs completas (Windows 10 / Ubuntu)

Esta pasta descreve a infraestrutura do **host dedicado** onde as VMs completas de Cyber Labs (Windows 10 e Ubuntu Desktop) realmente rodam. Esse host é **separado** da aplicação principal (que continua no Render) porque VMs completas precisam de virtualização de hardware (KVM) e containers privilegiados — algo que um PaaS simples como o Render não oferece.

## Por que um host separado

- `apps/api` (Render) comanda esse host remotamente via **Docker sobre TLS** (`DOCKER_HOST=tcp://<host>:2376` + certificados mTLS) — o mesmo padrão `child_process.exec('docker ...')` que o driver de labs CTF (`DockerLabDriver`) já usa, sem precisar de um microsserviço novo.
- As VMs (containers `dockurr/windows`, `dorowu/ubuntu-desktop-lxde-vnc`) ficam **exclusivamente** na rede `tica-labs-isolated` (`internal: true`) — sem rota de saída para a internet ou para a rede corporativa. Essa rede é a única linha de defesa de isolamento, já que o `VmLabDriver` não pode aplicar `--cap-drop ALL`/`--read-only` (o QEMU precisa escrever o disco virtual e o driver Windows precisa de `NET_ADMIN`). Ver `docs/01-architecture.md`.

## Pré-requisitos do host

1. Linux com **`/dev/kvm` acessível** (virtualização de hardware habilitada na BIOS/hypervisor) — obrigatório para labs **Windows 10**. Ubuntu Desktop funciona sem KVM.
2. Docker instalado, com `dockerd` configurado para escutar em TCP **com TLS mútuo** (`--tlsverify`), e a porta 2376 acessível apenas pela API (idealmente via túnel/VPN — nunca exposta abertamente).
3. Dimensionamento real: cada VM Windows completa consome ordens de grandeza mais CPU/RAM/disco que um container CTF (defaults: 4 vCPU / 8GB RAM / 32GB de disco por instância). Planeje o host para o número de analistas simultâneos esperado.
4. Se for usar `LAB_VM_ACCESS_MODE=traefik-labels` (recomendado para produção — evita mixed content, já que `apps/web` roda em HTTPS): um domínio wildcard (`LAB_PUBLIC_DOMAIN`) apontando para este host, e credenciais do provedor de DNS para o desafio ACME do Let's Encrypt.

## Passos

```bash
./check-host.sh                              # confirma KVM + Docker
docker compose -f docker-compose.labs.yml up -d   # cria as redes + Traefik (se usar traefik-labels)
```

Depois, configure na API (Render): `DOCKER_HOST`, `DOCKER_TLS_VERIFY`, `DOCKER_CERT_PATH`, `LAB_VM_ACCESS_MODE`, `LAB_VM_HOST` ou `LAB_PUBLIC_DOMAIN` (ver `.env.example` na raiz do monorepo).

## Limpeza de disco

Discos de VM (`.qcow2`) são grandes. O `VmLabDriver.destroy()` já remove o volume nomeado da instância junto com o container, e o job `cleanupExpired()` (cron a cada minuto, `apps/api/src/jobs/jobs.service.ts`) chama esse `destroy()` para instâncias expiradas — mas vale rodar periodicamente `docker system prune --volumes` neste host como rede de segurança contra volumes órfãos.

## Enquanto o host não está configurado

Sem `DOCKER_HOST` apontando para aqui, o `VmLabDriver` cai automaticamente em **modo simulação** (mesmo comportamento do `DockerLabDriver` sem Docker disponível) — os labs de VM continuam "funcionando" na plataforma (status vai a `RUNNING`), só que sem `accessUrl` real. Nenhuma VM é provisionada de fato até este host existir e estar configurado.
