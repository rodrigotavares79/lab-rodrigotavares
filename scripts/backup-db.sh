#!/usr/bin/env bash
# Backup manual do banco (Neon Free tem janela curta de point-in-time
# restore — isso aqui é uma rede de segurança adicional, não substitui
# conferir/ajustar a retenção no painel do Neon).
#
# Gera um dump no formato "custom" do pg_dump (compactado, restaurável com
# pg_restore) em backups/condominio-AAAAMMDD-HHMMSS.dump. Mantém só os 10
# mais recentes. A pasta backups/ está no .gitignore — nunca vai pro git.
#
# Rode com:
#   bash scripts/backup-db.sh
#
# Para restaurar um backup (sobrescreve o banco de destino):
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/condominio-AAAAMMDD-HHMMSS.dump

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale o cliente do PostgreSQL (inclui pg_dump e psql) e rode de novo." >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  echo ".env.local não encontrado." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL não encontrada em .env.local." >&2
  exit 1
fi

mkdir -p backups
CARIMBO=$(date +%Y%m%d-%H%M%S)
ARQUIVO="backups/condominio-$CARIMBO.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --file="$ARQUIVO"
echo "Backup salvo em $ARQUIVO"

# Mantém só os 10 mais recentes, pra não acumular disco indefinidamente.
mapfile -t ANTIGOS < <(ls -1t backups/condominio-*.dump 2>/dev/null | tail -n +11)
if [ "${#ANTIGOS[@]}" -gt 0 ]; then
  rm -f -- "${ANTIGOS[@]}"
  echo "Removidos ${#ANTIGOS[@]} backup(s) antigo(s), mantendo os 10 mais recentes."
fi
