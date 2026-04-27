#!/bin/bash

#############################################
# Script de despliegue para rat_dnsipd
# Sistema: RAT DNS IP Daemon
# Entorno: NestJS + React + PostgreSQL
#############################################

set -e  # Detener el script si hay error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuración
PROJECT_DIR="/usr/local/src/rat_dnsipd"
LOG_FILE="/var/log/rat_dnsipd-deploy.log"
ENV_FILE="$PROJECT_DIR/.env"
DOCKER_COMPOSE_VERSION="2.29.0"

# Función para loguear
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Verificar que se ejecuta como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script debe ejecutarse como root (sudo ./deploy.sh)"
    fi
}

# Instalar dependencias del sistema
install_system_deps() {
    log "Instalando dependencias del sistema..."
    
    dnf update -y || error "Error al actualizar el sistema"
    dnf install -y curl git unzip openssl || error "Error al instalar paquetes base"
    
    log "✅ Dependencias del sistema instaladas"
}

# Instalar Docker
install_docker() {
    log "Instalando Docker Engine..."
    
    # Verificar si Docker ya está instalado
    if command -v docker &> /dev/null; then
        warning "Docker ya está instalado, verificando versión..."
        docker --version
        return 0
    fi
    
    # Instalar Docker desde el repositorio oficial
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Iniciar Docker
    systemctl enable docker
    systemctl start docker
    
    log "✅ Docker instalado correctamente"
}

# Instalar Docker Compose
install_docker_compose() {
    log "Instalando Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        warning "Docker Compose ya está instalado"
        docker-compose --version
        return 0
    fi
    
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "✅ Docker Compose ${DOCKER_COMPOSE_VERSION} instalado"
}

# Instalar Node.js 22 LTS
install_nodejs() {
    log "Instalando Node.js 22 LTS..."
    
    if command -v node &> /dev/null; then
        warning "Node.js ya está instalado"
        node --version
        return 0
    fi
    
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
    
    log "✅ Node.js $(node --version) instalado"
}

# Configurar variables de entorno
setup_env_variables() {
    log "Configurando variables de entorno..."
    
    # Generar JWT_SECRET aleatorio
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > $ENV_FILE << EOF
# Base de datos
DATABASE_URL=postgresql://rat_user:rat_password@postgres:5432/rat_db?schema=public

# JWT Configuración
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=8h

# Servidor
PORT=3000
NODE_ENV=production

# URLs de servicios (para Docker)
BACKEND_URL=http://backend:3000
FRONTEND_URL=http://localhost:5173

# Configuración de Prisma
PRISMA_GENERATE_SKIP_AUTO=true
EOF
    
    # Crear archivo .env para desarrollo local (sin Docker)
    cat > $PROJECT_DIR/.env.local << EOF
DATABASE_URL=postgresql://rat_user:rat_password@localhost:5432/rat_db?schema=public
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
EOF
    
    log "✅ Variables de entorno configuradas"
    log "📝 JWT_SECRET guardado en: $ENV_FILE"
    log "⚠️  Cambia las contraseñas por seguridad antes de producción"
}

# Crear Dockerfile para backend
create_backend_dockerfile() {
    log "Creando Dockerfile para backend..."
    
    cat > $PROJECT_DIR/Dockerfile.backend << 'EOF'
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci

# Copiar código fuente
COPY backend/ .

# Generar Prisma client
RUN npx prisma generate

# Construir aplicación
RUN npm run build

# Imagen de producción
FROM node:22-alpine

WORKDIR /app

# Instalar dependencias de producción
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --only=production

# Copiar build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main"]
EOF
    
    log "✅ Dockerfile.backend creado"
}

# Crear Dockerfile para frontend
create_frontend_dockerfile() {
    log "Creando Dockerfile para frontend..."
    
    cat > $PROJECT_DIR/Dockerfile.frontend << 'EOF'
# Etapa de build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY frontend/package*.json ./
RUN npm ci

# Copiar código fuente y construir
COPY frontend/ .
RUN npm run build

# Etapa de producción con Nginx
FROM nginx:alpine

# Copiar build al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
    
    log "✅ Dockerfile.frontend creado"
}

# Crear docker-compose.yml
create_docker_compose() {
    log "Creando docker-compose.yml..."
    
    cat > $PROJECT_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: rat_postgres
    environment:
      POSTGRES_DB: rat_db
      POSTGRES_USER: rat_user
      POSTGRES_PASSWORD: rat_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - rat_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rat_user -d rat_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: rat_backend
    environment:
      - DATABASE_URL=postgresql://rat_user:rat_password@postgres:5432/rat_db?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=8h
      - PORT=3000
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - rat_network
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: rat_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - rat_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local

networks:
  rat_network:
    driver: bridge
EOF
    
    log "✅ docker-compose.yml creado"
}

# Crear script de inicialización de base de datos
create_db_init_script() {
    log "Creando script de inicialización de base de datos..."
    
    cat > $PROJECT_DIR/init-db.sh << 'EOF'
#!/bin/bash

echo "Inicializando base de datos para rat_dnsipd"

# Esperar a que PostgreSQL esté listo
echo "Esperando a PostgreSQL..."
until PGPASSWORD=rat_password psql -h localhost -U rat_user -d rat_db -c '\q' 2>/dev/null; do
  echo "PostgreSQL no está listo - esperando..."
  sleep 2
done

echo "PostgreSQL está listo"

# Ejecutar migraciones de Prisma
cd /usr/local/src/rat_dnsipd/backend
npm run prisma:migrate:deploy

# Ejecutar seed si es necesario
npm run prisma:seed

echo "Base de datos inicializada correctamente"
EOF
    
    chmod +x $PROJECT_DIR/init-db.sh
    log "✅ Script init-db.sh creado"
}

# Crear script de respaldo
create_backup_script() {
    log "Creando script de respaldo..."
    
    cat > $PROJECT_DIR/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/rat_dnsipd"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Respaldo de la base de datos
docker exec rat_postgres pg_dump -U rat_user rat_db > $BACKUP_DIR/rat_db_$DATE.sql

# Compresor
gzip $BACKUP_DIR/rat_db_$DATE.sql

# Mantener solo los últimos 7 respaldos
cd $BACKUP_DIR && ls -t rat_db_*.sql.gz | tail -n +8 | xargs rm -f 2>/dev/null

echo "Respaldo completado: $BACKUP_DIR/rat_db_$DATE.sql.gz"
EOF
    
    chmod +x $PROJECT_DIR/backup.sh
    log "✅ Script backup.sh creado"
}

# Instalar dependencias npm locales (sin Docker)
install_npm_deps() {
    log "Instalando dependencias npm locales (opcional)..."
    
    cd $PROJECT_DIR
    
    # Verificar estructura del proyecto
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        log "Instalando dependencias del backend..."
        cd backend
        npm install
        cd ..
    fi
    
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        log "Instalando dependencias del frontend..."
        cd frontend
        npm install
        cd ..
    fi
    
    log "✅ Dependencias npm instaladas"
}

# Configurar firewall
configure_firewall() {
    log "Configurando firewall..."
    
    # Abrir puertos necesarios
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=5432/tcp
    
    # Recargar firewall
    firewall-cmd --reload
    
    log "✅ Firewall configurado (puertos: 80, 3000, 5432)"
}

# Desplegar con Docker
deploy_with_docker() {
    log "Desplegando aplicación con Docker..."
    
    cd $PROJECT_DIR
    
    # Construir y levantar contenedores
    docker-compose down 2>/dev/null || true
    docker-compose build --no-cache
    docker-compose up -d
    
    # Esperar a que PostgreSQL esté listo
    log "Esperando a que los servicios inicien..."
    sleep 10
    
    # Ejecutar migraciones
    log "Ejecutando migraciones de Prisma..."
    docker exec rat_backend npx prisma migrate deploy
    
    log "✅ Aplicación desplegada con Docker"
}

# Verificar estado de la aplicación
check_status() {
    log "Verificando estado de la aplicación..."
    
    echo -e "\n${GREEN}=== Contenedores en ejecución ===${NC}"
    docker-compose ps
    
    echo -e "\n${GREEN}=== Logs de backend (últimas 10 líneas) ===${NC}"
    docker-compose logs --tail=10 backend
    
    echo -e "\n${GREEN}=== Testing API ===${NC}"
    curl -s http://localhost:3000/health || warning "Backend no responde o endpoint /health no existe"
    
    echo -e "\n${GREEN}=== Acceso web ===${NC}"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:3000"
    echo "Base de datos: localhost:5432"
}

# Función principal
main() {
    log "========================================="
    log "Iniciando despliegue de rat_dnsipd"
    log "========================================="
    
    check_root
    install_system_deps
    install_docker
    install_docker_compose
    install_nodejs
    setup_env_variables
    
    create_backend_dockerfile
    create_frontend_dockerfile
    create_docker_compose
    create_db_init_script
    create_backup_script
    
    # Opcional: instalar dependencias locales (comentar si no se necesita)
    install_npm_deps
    
    configure_firewall
    deploy_with_docker
    check_status
    
    log "========================================="
    log "✅ Despliegue completado exitosamente"
    log "========================================="
    log "📝 Archivo de configuración: $ENV_FILE"
    log "📝 Logs del sistema: $LOG_FILE"
    log "🔄 Script de respaldo: $PROJECT_DIR/backup.sh"
    log "🐘 Base de datos: PostgreSQL en puerto 5432"
    log "🌐 Frontend: http://localhost"
    log "🔌 API: http://localhost:3000"
    log "⚠️  Recuerda cambiar las contraseñas por defecto"
}

# Ejecutar script
main