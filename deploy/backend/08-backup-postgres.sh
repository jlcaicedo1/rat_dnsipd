#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/app/rat_dnsipd/backups/postgres"
DB_NAME="rat_db"
DB_USER="rat_app"
DATE_TAG="$(date +%F-%H%M%S)"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

export PGPASSWORD="${PGPASSWORD:-}"

pg_dump -U "${DB_USER}" -h 127.0.0.1 -d "${DB_NAME}" | gzip > "${BACKUP_DIR}/rat_db_${DATE_TAG}.sql.gz"

find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup generado en ${BACKUP_DIR}/rat_db_${DATE_TAG}.sql.gz"
