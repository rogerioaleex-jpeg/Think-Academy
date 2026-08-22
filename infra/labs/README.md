# Lab plane — host dedicado para VMs completas (Windows 10 / Ubuntu)

Esta pasta descreve a infraestrutura do **host dedicado** onde as VMs completas de Cyber Labs (Windows 10 e Ubuntu Desktop) realmente rodam. Esse host é **separado** da aplicação principal (que continua no Render) porque VMs completas precisam de virtualização de hardware (KVM) e containers privilegiados — algo que um PaaS simples como o Render não oferece.

## Por que um host separado

- `apps/api` (Render) comanda esse host remotamente via **Docker sobre TLS** (`DOCKER_HOST=tcp://<host>:2376` + certificados mTLS) — o mesmo padrão `child_process.exec('docker ...')` que o driver de labs CTF (`DockerLabDriver`) já usa, sem precisar de um microsserviço novo.
- As VMs (containers `dockurr/windows`, `dorowu/ubuntu-desktop-lxde-vnc`) ficam **exclusivamente** na rede `tica-labs-isolated` (`internal: true`) — sem rota de saída para a internet ou para a rede corporativa. Essa rede é a única linha de defesa de isolamento, já que o `VmLabDriver` não pode aplicar `--cap-drop ALL`/`--read-only` (o QEMU precisa escrever o disco virtual e o driver Windows precisa de `NET_ADMIN`). Ver `docs/01-architecture.md`.

## Pré-requisitos do host

1. Linux com **`/dev/kvm` acessível** (virtualização de hardware habilitada na BIOS/hypervisor) — obrigatório para labs **Windows 10**. Ubuntu Desktop funciona sem KVM.
2. Docker instalado, com `dockerd` configurado para escutar em TCP **com TLS mútuo** (`--tlsverify`), e a porta 2376 acessível apenas pela API (idealmente via túnel/VPN — nunca exposta abertamente).
3. Dimensionamento real: cada VM Windows completa consome ordens de grandeza mais CPU/RAM/disco que um container CTF (defaults: 4 vCPU / 8GB RAM / 32GB de disco por instância). Planeje o host para o número de analistas simultâneos esperado.
4. `LAB_VM_ACCESS_MODE=traefik-labels` (padrão) precisa de um domínio wildcard (`LAB_PUBLIC_DOMAIN`) apontando para este host e credenciais do provedor de DNS para o desafio ACME do Let's Encrypt.

> **Validado na prática (não só em teoria):** testamos ao vivo num host real que redes Docker `internal: true` — a rede isolada acima — **não publicam portas** (`docker port` nunca resolve nada nelas, mesmo sem erro). Isso significa que o modo `direct-port` **não funciona** enquanto a VM estiver em `tica-labs-isolated` — é estrutural, não um bug a corrigir. Confirmamos também que a comunicação container-a-container *dentro* da rede internal funciona normalmente, e que o Traefik (com uma pata na rede isolada e outra numa rede com saída) consegue rotear o tráfego externo até a VM isolada preservando o isolamento — é exatamente esse o papel do modo `traefik-labels`, por isso ele é o padrão. Só use `direct-port` se `LAB_NETWORK` apontar para uma rede explicitamente **não** internal, e mesmo assim apenas para teste local sem nenhuma garantia de isolamento.

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

**3. Configure o desafio DNS do Let's Encrypt (Cloudflare)** — crie `/root/.env` **no servidor** (nunca no git) ao lado do `docker-compose.labs.yml`, com:
```
LAB_ACME_EMAIL=seu-email@exemplo.com
LAB_ACME_DNS_PROVIDER=cloudflare
CF_DNS_API_TOKEN=<token com permissão Zone:DNS:Edit, restrito à zona do seu domínio>
# MESMO valor que você vai configurar em LAB_PUBLIC_DOMAIN na API (Render).
# O Traefik usa isso pra obter UM certificado wildcard (*.<valor>) uma única
# vez no boot — validado em produção: emitir certificado por instância (sem
# isso) levava ~50s por lab e arriscava o limite semanal do Let's Encrypt.
LAB_PUBLIC_DOMAIN=labs.seudominio.com.br
```
Aponte um registro DNS **wildcard** (`A`, nome `*.labs`, conteúdo o IP público do servidor, proxy **DNS only**) na zona do seu domínio, e então:
```bash
docker compose -f docker-compose.labs.yml up -d traefik
```

**4. Configure a API (Render):**
   - Suba `ca.pem`, `cert.pem`, `key.pem` como **Secret Files** do serviço `tica-api` (nunca como variável de ambiente em texto).
   - Defina `DOCKER_HOST=tcp://<ip-do-servidor>:2376`, `DOCKER_TLS_VERIFY=1`, `DOCKER_CERT_PATH=<caminho onde o Render montou os secret files>`.
   - Defina `LAB_PUBLIC_DOMAIN=labs.<seu-domínio>` (`LAB_VM_ACCESS_MODE=traefik-labels` já é o padrão e é obrigatório — ver o quadro de validação acima).

**5. Abra as portas necessárias no firewall do host** (NSG na Azure, Security Group na AWS, etc.):
   - `443/tcp` — obrigatória e pública, é por onde o Traefik serve o HTTPS de cada VM pros alunos.
   - `2376/tcp` — restrinja se possível (nunca deixe aberta "por padrão" sem pensar). Se você habilitar o add-on de IP de saída estático do Render, libere só esse IP (`ufw allow from <ip-do-render> to any port 2376`); senão, considere um túnel WireGuard entre Render e o host em vez de expor a porta diretamente. Protegida por TLS mútuo mesmo assim — só quem tem o certificado-cliente gerado no passo 2 consegue autenticar.

Depois de tudo isso, sem precisar reimplantar nada do código: da próxima vez que um analista clicar em "Iniciar lab" numa VM, o `VmLabDriver` vai detectar Docker+KVM disponíveis e provisionar de verdade — **validado em produção**: domínio real (Cloudflare), certificado Let's Encrypt emitido automaticamente pelo Traefik, HTTPS respondendo 200 no `accessUrl` gerado pela própria plataforma.

## RDP via navegador (Apache Guacamole) — labs com osType `*_RDP`

Labs como `UBUNTU_DESKTOP_RDP` acessam a VM por **RDP** (não noVNC) — mas RDP não é HTTP, então o Traefik não consegue rotear por `Host()` como faz com o noVNC. A solução é um gateway **Apache Guacamole**, mantendo a VM na rede isolada (Guacamole alcança o container pelo IP interno; o aluno só fala HTTP/WebSocket com o Guacamole).

**Setup de primeira vez** (depois do passo 2 acima já ter criado as redes):

```bash
# Gere uma senha forte pro Postgres do Guacamole e salve em /root/.env (ao
# lado das outras variáveis já configuradas):
echo "GUAC_DB_PASSWORD=$(openssl rand -base64 24)" >> /root/.env

docker compose -f docker-compose.labs.yml up -d guacamole-db guacd guacamole

# Aplica o schema (cria o usuário admin padrão guacadmin/guacadmin) — só
# precisa rodar UMA VEZ (o volume guac-db-data persiste depois disso):
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > /root/guac-initdb.sql
docker exec -i tica-labs-guacamole-db-1 psql -U guacamole_user -d guacamole_db < /root/guac-initdb.sql
```

Depois, **troque a senha padrão do `guacadmin`** (nunca deixe `guacadmin/guacadmin` em produção):

```bash
TOKEN=$(curl -sk -X POST "https://guac.<LAB_PUBLIC_DOMAIN>/guacamole/api/tokens" \
  -d "username=guacadmin&password=guacadmin" | python3 -c "import sys,json;print(json.load(sys.stdin)['authToken'])")
curl -sk -X PUT "https://guac.<LAB_PUBLIC_DOMAIN>/guacamole/api/session/data/postgresql/users/guacadmin/password?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"guacadmin","newPassword":"<senha-forte-nova>"}'
```

Por fim, configure na API (Render): `GUACAMOLE_URL=https://guac.<LAB_PUBLIC_DOMAIN>/guacamole`, `GUACAMOLE_ADMIN_USER=guacadmin`, `GUACAMOLE_ADMIN_PASSWORD=<a senha nova>`. A partir daí, o `VmLabDriver` cria/destrói a conexão RDP de cada instância automaticamente via a API REST do Guacamole (ver `apps/api/src/labs/drivers/guacamole.client.ts`) — **validado em produção**: RDP real via xrdp, sessão visível no navegador através do Guacamole, mesmo certificado wildcard do Traefik reaproveitado (`guac.<LAB_PUBLIC_DOMAIN>` cai dentro do `*.<LAB_PUBLIC_DOMAIN>`).

## Labs WINDOWS10 — ISO em cache e imagem dourada

`dockurr/windows` baixa a ISO do Windows da Microsoft no primeiro boot — a
rede isolada (`tica-labs-isolated`, `internal:true`) não tem saída à
internet, então sem um destes dois passos o boot fica em loop eterno de erro
de DNS (`Could not resolve host: vlscppe.microsoft.com`).

**Nível 1 — ISO em cache (mínimo viável)**: baixe a ISO uma vez aqui no host
(fora do Docker) e aponte `WINDOWS_ISO_CACHE_PATH` na API pra ela. Funciona,
mas toda instância nova (inclusive depois de um "Resetar") roda o instalador
completo do Windows do zero (~15+ min):

```bash
sudo mkdir -p /opt/tica-labs/iso-cache
sudo curl -L -o /opt/tica-labs/iso-cache/win10.iso '<url-de-uma-iso-do-windows-10>'
# API (Render): WINDOWS_ISO_CACHE_PATH=/opt/tica-labs/iso-cache/win10.iso
```

**Nível 2 — imagem dourada (recomendado)**: instale o Windows *uma vez*,
deixe ele bootar completamente, pare o container e salve o disco pronto. Toda
instância nova clona esse disco em vez de instalar — boot cai pra ~1-2 min,
mesmo depois de Reset/expiração (que sempre recriam o volume do zero):

```bash
# 1) build isolado, sem afetar labs reais em uso
sudo docker volume create tica-golden-win10-build
sudo docker run --rm --network none \
  -v /opt/tica-labs/iso-cache/win10.iso:/src/custom.iso:ro \
  -v tica-golden-win10-build:/dst alpine cp /src/custom.iso /dst/custom.iso
sudo docker run -d --name tica-golden-win10-build --network tica-labs-isolated \
  --device=/dev/kvm --cap-add NET_ADMIN --cpus=4 --memory=8192m \
  -v tica-golden-win10-build:/storage \
  -e VERSION=10 -e RAM_SIZE=8G -e CPU_CORES=4 -e DISK_SIZE=32G dockurr/windows

# 2) acompanhe (demora — instalação real do Windows, várias reinicializações)
sudo docker logs -f tica-golden-win10-build

# 3) IMPORTANTE — validado na prática que /storage/windows.boot NÃO é
#    confiável como sinal de "terminou": numa tentativa real (VM Azure,
#    AMD EPYC, KVM aninhado) o Windows chegou à área de trabalho
#    normalmente mas o guest travou de fato (nem o relógio da barra de
#    tarefas avançava, nem reagia a tecla via QEMU monitor) SEM nunca
#    criar esse arquivo — o processo ficaria esperando pra sempre. Confirme
#    visualmente antes de prosseguir, com um screendump real da tela (não
#    precisa VNC/browser — usa o monitor do QEMU direto):
#      sudo docker exec tica-golden-win10-build python3 -c "
#        import socket, time
#        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); s.settimeout(5)
#        s.connect('/run/shm/monitor.sock'); s.recv(4096)
#        s.send(b'screendump /tmp/screen.ppm\n'); time.sleep(2)"
#      sudo docker cp tica-golden-win10-build:/tmp/screen.ppm /tmp/screen.ppm
#      sudo apt-get install -y imagemagick && sudo convert /tmp/screen.ppm /tmp/screen.png
#    Baixe /tmp/screen.png e olhe: desktop carregado? Tire um SEGUNDO
#    screendump ~1-2min depois e compare — se o relógio da barra de tarefas
#    não mudou NADA (pixel a pixel idêntico), o guest travou; mande um
#    'sendkey esc' pelo mesmo socket do monitor antes do 2º screendump como
#    teste adicional (nenhuma reação = travamento confirmado, aborte e não
#    use esse disco como imagem dourada). Só depois de confirmar visualmente
#    que está respondendo, pare graciosamente (dá tempo do ACPI shutdown
#    deixar o disco consistente):
sudo docker stop -t 60 tica-golden-win10-build

# 4) exporte o /storage inteiro pra um diretório fora de qualquer volume de
#    instância — é ele que WINDOWS_GOLDEN_IMAGE_PATH vai apontar
sudo mkdir -p /opt/tica-labs/golden-win10
sudo docker run --rm -v tica-golden-win10-build:/src:ro \
  -v /opt/tica-labs/golden-win10:/dst alpine cp -a /src/. /dst/
sudo docker rm -f tica-golden-win10-build
sudo docker volume rm -f tica-golden-win10-build

# API (Render): WINDOWS_GOLDEN_IMAGE_PATH=/opt/tica-labs/golden-win10
# (tem prioridade sobre WINDOWS_ISO_CACHE_PATH — pode manter os dois)
```

Repita o processo (numa nova pasta) se quiser atualizar a imagem dourada —
ex.: depois de instalar ferramentas que os labs precisem ter pré-instaladas.

## Imagem "pentest desktop" (nmap, Wireshark/tshark, tcpdump, netstat)

Desktop Ubuntu comum (`danielguerra/ubuntu-xrdp`, o mesmo dos demais labs
`UBUNTU_DESKTOP_RDP`) NÃO tem ferramentas de rede/pentest instaladas —
validado que labs que pedem pra rodar nmap numa VM assim simplesmente não
tinham o binário disponível. A imagem `tica-lab-pentest-desktop` estende a
mesma base com `nmap`, `wireshark`/`tshark`, `tcpdump`, `net-tools` reais,
construída uma vez no host (Dockerfile em `infra/labs/pentest-desktop/`):

```bash
docker build -t tica-lab-pentest-desktop:latest infra/labs/pentest-desktop/
```

Labs que usam essa imagem apontam `dockerImage: 'tica-lab-pentest-desktop:latest'`
no seed/admin, mantendo `osType: UBUNTU_DESKTOP_RDP` (o driver de VM já dá
prioridade a `dockerImage` quando presente, mesmo em labs VM — ver
`vm.driver.ts`). Reconstrua a imagem se precisar adicionar mais ferramentas.

## Labs DOCKER com dados sintéticos reais

Validado em produção: 3 labs de análise (`soc-investigation-brute-force`,
`log-analysis-web-access`, `kql-basics-sentinel`) usavam o placeholder
`nginx:alpine` sem NENHUM dado real — o aluno não tinha como encontrar as
respostas. Cada um agora tem sua própria imagem custom (Dockerfiles em
`infra/labs/<slug>/`) que serve o log/tabela sintética de verdade via HTTP,
no `accessUrl` da instância. Ao criar um lab DOCKER novo com desafio de
"análise de log/dados", sempre baseie a imagem em algo que realmente
contenha o dado — nunca deixe no `nginx:alpine` puro por padrão.

## Limpeza de disco

Discos de VM (`.qcow2`) são grandes. O `VmLabDriver.destroy()` já remove o volume nomeado da instância junto com o container, e o job `cleanupExpired()` (cron a cada minuto, `apps/api/src/jobs/jobs.service.ts`) chama esse `destroy()` para instâncias expiradas — mas vale rodar periodicamente `docker system prune --volumes` neste host como rede de segurança contra volumes órfãos.

## Enquanto o host não está configurado

Sem `DOCKER_HOST` apontando para aqui, o `VmLabDriver` cai automaticamente em **modo simulação** (mesmo comportamento do `DockerLabDriver` sem Docker disponível) — os labs de VM continuam "funcionando" na plataforma (status vai a `RUNNING`), só que sem `accessUrl` real. Nenhuma VM é provisionada de fato até este host existir e estar configurado.
