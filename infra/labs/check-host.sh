#!/usr/bin/env bash
# Checagem rápida do host dedicado de labs (VMs Windows/Ubuntu) antes de
# apontar DOCKER_HOST para ele. Ver README.md desta pasta.
set -uo pipefail

ok=0

echo "== Cyber Labs — checagem do host dedicado =="

if [ -e /dev/kvm ] && [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
  echo "[OK]   /dev/kvm acessível — labs Windows 10 podem rodar com aceleração de hardware."
else
  echo "[AVISO] /dev/kvm indisponível — labs Windows cairão em modo SIMULAÇÃO (Ubuntu Desktop continua funcionando)."
fi

if command -v docker >/dev/null 2>&1 && docker version >/dev/null 2>&1; then
  echo "[OK]   Docker disponível ($(docker version --format '{{.Server.Version}}' 2>/dev/null))."
else
  echo "[ERRO] Docker não encontrado ou dockerd não respondeu."
  ok=1
fi

if docker network inspect tica-labs-isolated >/dev/null 2>&1; then
  echo "[OK]   Rede isolada tica-labs-isolated já existe."
else
  echo "[INFO] Rede tica-labs-isolated ainda não existe — rode 'docker compose -f docker-compose.labs.yml up -d' ou deixe o driver criá-la automaticamente."
fi

exit $ok
