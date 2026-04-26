#!/usr/bin/env bash
set -euo pipefail

echo "==> Instalando Node.js desde NodeSource 22.x"
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

echo "==> Instalando Nginx desde repositorio del sistema"
dnf install -y nginx

echo "==> Versiones instaladas"
node -v
npm -v
nginx -v

echo "==> Habilitando Nginx"
systemctl enable --now nginx
