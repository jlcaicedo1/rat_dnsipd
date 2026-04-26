#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/app/rat_dnsipd"
APP_USER="ratapp"
APP_GROUP="ratapp"

echo "==> Actualizando paquetes del sistema"
dnf -y update

echo "==> Instalando utilidades base"
dnf install -y \
  git \
  curl \
  wget \
  unzip \
  tar \
  rsync \
  vim \
  policycoreutils-python-utils \
  firewalld \
  logrotate

echo "==> Habilitando firewalld"
systemctl enable --now firewalld

echo "==> Creando usuario tecnico"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "${APP_ROOT}" --shell /sbin/nologin "${APP_USER}"
fi

echo "==> Creando estructura de directorios"
mkdir -p \
  "${APP_ROOT}/backend" \
  "${APP_ROOT}/frontend" \
  "${APP_ROOT}/releases" \
  "${APP_ROOT}/shared/env" \
  "${APP_ROOT}/shared/logs" \
  "${APP_ROOT}/shared/uploads" \
  "${APP_ROOT}/shared/temp" \
  "${APP_ROOT}/scripts" \
  "${APP_ROOT}/backups/postgres" \
  "${APP_ROOT}/postgresql/data"

chown -R "${APP_USER}:${APP_GROUP}" "${APP_ROOT}"
chmod -R 750 "${APP_ROOT}"

echo "==> Abriendo puertos HTTP/HTTPS"
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

echo "Servidor base preparado en ${APP_ROOT}"
