#!/usr/bin/env bash
# ============================================================================
# Cyber Labs — provisionamento do host dedicado (VMs Windows/Ubuntu)
#
# Rode este script APÓS criar o servidor (Hetzner Cloud "Dedicated vCPU" —
# linha CCX — ou OVH, com Ubuntu 22.04/24.04), via SSH, como root:
#
#   ssh root@<ip-do-servidor>
#   curl -fsSL -o setup-host.sh https://raw.githubusercontent.com/<seu-fork>/Think-Academy/main/infra/labs/setup-host.sh
#   chmod +x setup-host.sh
#   ./setup-host.sh <ip-publico-ou-dominio-do-servidor>
#
# O que ele faz:
#   1. Instala Docker (script oficial get.docker.com).
#   2. Confirma /dev/kvm acessível (nested virtualization).
#   3. Gera um CA + certificado do servidor + certificado de CLIENTE para
#      TLS mútuo do dockerd (padrão oficial do Docker — ver
#      https://docs.docker.com/engine/security/protect-access/).
#   4. Configura o dockerd para escutar em 0.0.0.0:2376 SÓ com TLS.
#   5. Cria as redes isoladas (docker-compose.labs.yml).
#   6. Baixa antecipadamente as imagens de VM (dockurr/windows,
#      dorowu/ubuntu-desktop-lxde-vnc) pra acelerar o primeiro provisionamento.
#
# Ao final, ele imprime os arquivos de certificado do CLIENTE — copie-os
# para a API (Render → Secret Files) e configure DOCKER_HOST/DOCKER_CERT_PATH
# conforme instruído no final da execução.
# ============================================================================
set -euo pipefail

# Resolvido ANTES de qualquer `cd` — usado no passo 5 para achar o compose
# ao lado deste script, independente do diretório de trabalho atual.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

HOST_ADDR="${1:-}"
if [ -z "$HOST_ADDR" ]; then
  echo "Uso: $0 <ip-publico-ou-dominio-do-servidor>" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode como root (sudo -i)." >&2
  exit 1
fi

CERT_DIR=/root/tica-docker-certs
DOCKER_CERT_DIR=/etc/docker/certs

echo "== 1/6: instalando Docker =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "== 2/6: checando /dev/kvm (virtualização de hardware) =="
if [ -e /dev/kvm ] && [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
  echo "[OK] /dev/kvm acessível — labs Windows 10 podem usar aceleração de hardware."
else
  echo "[AVISO] /dev/kvm indisponível — confirme que a instância foi criada com virtualização"
  echo "        aninhada habilitada (na Hetzner Cloud, a linha 'Dedicated vCPU'/CCX já vem com"
  echo "        isso; em outros provedores pode ser necessário pedir explicitamente)."
fi

echo "== 3/6: gerando certificados TLS (CA + servidor + cliente) =="
mkdir -p "$CERT_DIR" "$DOCKER_CERT_DIR"
cd "$CERT_DIR"

if [ ! -f ca-key.pem ]; then
  # Chave da CA sem passphrase (o arquivo já fica 0400, só root lê; ela não
  # sai deste servidor depois de assinar os certificados abaixo).
  openssl genrsa -out ca-key.pem 4096
  openssl req -new -x509 -days 3650 -key ca-key.pem -sha256 \
    -out ca.pem -subj "/CN=tica-labs-ca"

  openssl genrsa -out server-key.pem 4096
  openssl req -subj "/CN=$HOST_ADDR" -sha256 -new -key server-key.pem -out server.csr
  echo "subjectAltName = DNS:$HOST_ADDR,IP:$HOST_ADDR" > extfile.cnf
  echo "extendedKeyUsage = serverAuth" >> extfile.cnf
  openssl x509 -req -days 3650 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
    -CAcreateserial -out server-cert.pem -extfile extfile.cnf

  openssl genrsa -out key.pem 4096
  openssl req -subj "/CN=client" -new -key key.pem -out client.csr
  echo "extendedKeyUsage = clientAuth" > extfile-client.cnf
  openssl x509 -req -days 3650 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem \
    -CAcreateserial -out cert.pem -extfile extfile-client.cnf

  chmod 0400 ca-key.pem server-key.pem key.pem
  chmod 0444 ca.pem server-cert.pem cert.pem
  rm -f server.csr client.csr extfile.cnf extfile-client.cnf ca.srl
else
  echo "Certificados já existem em $CERT_DIR — reaproveitando."
fi

cp ca.pem server-cert.pem server-key.pem "$DOCKER_CERT_DIR/"

echo "== 4/6: configurando dockerd para TLS mútuo em :2376 =="
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd \\
  --containerd=/run/containerd/containerd.sock \\
  --tlsverify \\
  --tlscacert=$DOCKER_CERT_DIR/ca.pem \\
  --tlscert=$DOCKER_CERT_DIR/server-cert.pem \\
  --tlskey=$DOCKER_CERT_DIR/server-key.pem \\
  -H=0.0.0.0:2376 \\
  -H=unix:///var/run/docker.sock
EOF
systemctl daemon-reload
systemctl restart docker

echo "== 5/6: criando as redes isoladas dos labs =="
# Criadas via `docker network create` (não via `docker compose up`) — o
# docker-compose.labs.yml referencia essas redes como `external: true` de
# propósito, para não criar redes duplicadas prefixadas pelo nome do
# projeto. Ver comentário no topo do docker-compose.labs.yml.
docker network inspect tica-labs-isolated >/dev/null 2>&1 || docker network create --internal tica-labs-isolated
docker network inspect tica-labs-edge >/dev/null 2>&1 || docker network create tica-labs-edge

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi
if [ -f "$SCRIPT_DIR/.env" ]; then
  $COMPOSE -f "$SCRIPT_DIR/docker-compose.labs.yml" --env-file "$SCRIPT_DIR/.env" up -d traefik 2>&1 || \
    echo "[AVISO] Traefik não subiu — confira LAB_ACME_EMAIL/LAB_ACME_DNS_PROVIDER/CF_DNS_API_TOKEN em .env."
else
  echo "[INFO] Sem .env ao lado do compose ainda — Traefik não foi iniciado. Ver README.md antes de subir LAB_VM_ACCESS_MODE=traefik-labels em produção."
fi

echo "== 6/6: baixando imagens de VM antecipadamente =="
docker pull dockurr/windows || true
docker pull dorowu/ubuntu-desktop-lxde-vnc || true

echo
echo "============================================================"
echo " Host pronto. Configure na API (Render → Environment):"
echo "   DOCKER_HOST=tcp://$HOST_ADDR:2376"
echo "   DOCKER_TLS_VERIFY=1"
echo "   DOCKER_CERT_PATH=/etc/secrets/tica-docker   (ou onde você montar os 3 arquivos abaixo)"
echo
echo " Copie estes 3 arquivos do host para o Render (Secret Files, NÃO como env var em texto):"
echo "   $CERT_DIR/ca.pem"
echo "   $CERT_DIR/cert.pem"
echo "   $CERT_DIR/key.pem"
echo
echo " IMPORTANTE — restrinja a porta 2376 por firewall a só quem precisa acessá-la"
echo " (idealmente o IP de saída estático do Render, se você habilitar esse add-on;"
echo " nunca deixe 2376 aberta para a internet toda). Ex.: ufw allow from <ip-do-render> to any port 2376"
echo
echo " Labs WINDOWS10 (dockurr/windows) NÃO funcionam sem este passo manual:"
echo " a rede isolada não tem saída à internet, então a ISO do Windows precisa"
echo " ser baixada UMA VEZ aqui no host (fora do Docker) e apontada via"
echo " WINDOWS_ISO_CACHE_PATH na API — sem isso o boot fica em loop de erro de DNS."
echo "   sudo mkdir -p /opt/tica-labs/iso-cache"
echo "   sudo curl -L -o /opt/tica-labs/iso-cache/win10.iso '<url-de-uma-iso-do-windows-10>'"
echo "   # depois configure na API: WINDOWS_ISO_CACHE_PATH=/opt/tica-labs/iso-cache/win10.iso"
echo "============================================================"
