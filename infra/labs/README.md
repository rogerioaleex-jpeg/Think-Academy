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

## Dimensionamento — 5 a 10 analistas simultâneos

Cada VM (Windows ou Ubuntu) usa por padrão 4 vCPU / 8GB RAM (ajustável por lab). Para 5-10 analistas simultâneos, com margem para o próprio host/Traefik:

| Onde | O que procurar | Por quê |
|---|---|---|
| **Hetzner Cloud, linha "Dedicated vCPU" (CCX)** | `CCX53` (32 vCPU dedicado / 128GB RAM) para começar, ou `CCX63` (48 vCPU / 192GB) se quiser folga maior | Já vem com virtualização aninhada habilitada (não precisa pedir nada extra); provisiona em minutos via painel/API; fácil de redimensionar depois. **Sem datacenter no Brasil** — o mais próximo costuma ser EUA-Leste, o que soma latência ao noVNC (perceptível, mas ainda usável para tarefas de análise, não para jogos). |
| **OVHcloud, região São Paulo** | Um plano da linha Advance/Scale (dedicado) ou uma VPS/instância "Dedicated" com specs equivalentes (≥32 vCPU dedicado, ≥128GB RAM, NVMe) | Datacenter em São Paulo — latência bem menor pro público brasileiro da plataforma. Confirme no site da OVH quais planos atuais têm KVM/nested virtualization habilitado antes de comprar, pois os nomes/specs dos planos mudam com frequência. |

Comece pela opção menor (ex.: CCX53) para validar a feature; dá para migrar/redimensionar depois sem reescrever nada — o driver não depende do tamanho do host.

## Passos

**1. Você mesmo cria o servidor** (isso exige criar conta e pagar — não é algo que eu possa fazer por você):
   - Crie conta no provedor escolhido, suba um servidor Ubuntu 22.04/24.04 no tamanho da tabela acima, anote o IP público.
   - Confirme que a instância tem `/dev/kvm` (na Hetzner Cloud "Dedicated vCPU" já vem habilitado por padrão).

**2. Rode o script de setup no servidor**, via SSH, como root:
```bash
scp infra/labs/setup-host.sh infra/labs/docker-compose.labs.yml root@<ip-do-servidor>:/root/
ssh root@<ip-do-servidor>
chmod +x setup-host.sh
./setup-host.sh <ip-do-servidor>
```
Ele instala o Docker, confirma o KVM, gera os certificados TLS mútuos, configura o `dockerd` para escutar em `:2376` só com TLS, cria as redes isoladas e baixa antecipadamente as imagens `dockurr/windows`/`dorowu/ubuntu-desktop-lxde-vnc`. No final, ele imprime os 3 arquivos de certificado (`ca.pem`, `cert.pem`, `key.pem`) que você precisa levar para a API.

**3. Configure a API (Render):**
   - Suba `ca.pem`, `cert.pem`, `key.pem` como **Secret Files** do serviço `tica-api` (nunca como variável de ambiente em texto).
   - Defina `DOCKER_HOST=tcp://<ip-do-servidor>:2376`, `DOCKER_TLS_VERIFY=1`, `DOCKER_CERT_PATH=<caminho onde o Render montou os secret files>`.
   - Se for usar HTTPS por domínio (`traefik-labels`), defina também `LAB_VM_ACCESS_MODE=traefik-labels` e `LAB_PUBLIC_DOMAIN`.

**4. Restrinja o firewall da porta 2376** — nunca deixe aberta pra internet toda. Se você habilitar o add-on de IP de saída estático do Render, libere só esse IP (`ufw allow from <ip-do-render> to any port 2376`); senão, considere um túnel WireGuard entre Render e o host em vez de expor a porta diretamente.

Depois de tudo isso, sem precisar reimplantar nada do código: da próxima vez que um analista clicar em "Iniciar lab" numa VM, o `VmLabDriver` vai detectar Docker+KVM disponíveis e provisionar de verdade.

## Limpeza de disco

Discos de VM (`.qcow2`) são grandes. O `VmLabDriver.destroy()` já remove o volume nomeado da instância junto com o container, e o job `cleanupExpired()` (cron a cada minuto, `apps/api/src/jobs/jobs.service.ts`) chama esse `destroy()` para instâncias expiradas — mas vale rodar periodicamente `docker system prune --volumes` neste host como rede de segurança contra volumes órfãos.

## Enquanto o host não está configurado

Sem `DOCKER_HOST` apontando para aqui, o `VmLabDriver` cai automaticamente em **modo simulação** (mesmo comportamento do `DockerLabDriver` sem Docker disponível) — os labs de VM continuam "funcionando" na plataforma (status vai a `RUNNING`), só que sem `accessUrl` real. Nenhuma VM é provisionada de fato até este host existir e estar configurado.
