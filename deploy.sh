#!/bin/bash

# Скрипт для деплоя English проектов из GitHub
# Использование: ./deploy.sh [client|server|all]

set -e

ENGLISH_DIR="/var/www/english"
REPO_URL="https://github.com/Pe6e3/english-dictionary.git"
REPO_DIR="/tmp/english-dictionary"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Клонирование или обновление репозитория
update_repo() {
    log_info "Обновление репозитория из GitHub..."
    
    if [ -d "$REPO_DIR" ]; then
        log_info "Репозиторий уже клонирован, обновляем..."
        cd "$REPO_DIR"
        git pull origin main || git pull origin master
    else
        log_info "Клонирование репозитория..."
        git clone "$REPO_URL" "$REPO_DIR"
        cd "$REPO_DIR"
    fi
    
    log_info "✅ Репозиторий обновлен"
}

# Деплой клиента
deploy_client() {
    log_info "Деплой English Client..."
    
    # Копирование файлов из репозитория
    log_info "Копирование файлов клиента..."
    rsync -av --delete --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
        "$REPO_DIR/client/" \
        "$ENGLISH_DIR/client/"
    
    cd "$ENGLISH_DIR/client"
    
    # Установка зависимостей
    if [ -f "package.json" ]; then
        log_info "Установка зависимостей..."
        npm install --legacy-peer-deps
        
        # Сборка проекта
        if grep -q "\"build\"" package.json; then
            log_info "Сборка проекта..."
            npm run build
        else
            log_warn "Скрипт build не найден в package.json"
        fi
    else
        log_error "package.json не найден!"
        return 1
    fi
    
    log_info "✅ English Client задеплоен"
}

# Деплой сервера
deploy_server() {
    log_info "Деплой English Server..."
    
    # Копирование файлов из репозитория
    log_info "Копирование файлов сервера..."
    rsync -av --delete --exclude 'node_modules' --exclude '.git' \
        "$REPO_DIR/server/" \
        "$ENGLISH_DIR/server/"
    
    cd "$ENGLISH_DIR/server"
    
    # Установка зависимостей
    if [ -f "package.json" ]; then
        log_info "Установка зависимостей..."
        npm install --legacy-peer-deps --production
        
        # Сборка проекта (если есть TypeScript)
        if [ -f "tsconfig.json" ]; then
            log_info "Сборка TypeScript..."
            if grep -q "\"build\"" package.json; then
                npm run build
            fi
        fi
    else
        log_error "package.json не найден!"
        return 1
    fi
    
    # Убеждаемся, что ecosystem.config.js существует
    if [ ! -f "ecosystem.config.js" ]; then
        log_warn "ecosystem.config.js не найден, создаем..."
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'english-backend',
    script: 'server.js',
    cwd: '/var/www/english/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4003
    },
    error_file: '/var/log/pm2/english-backend-error.log',
    out_file: '/var/log/pm2/english-backend-out.log',
    log_file: '/var/log/pm2/english-backend.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    fi
    
    # Перезапуск через PM2
    log_info "Перезапуск через PM2..."
    if pm2 list | grep -q "english-backend"; then
        pm2 restart english-backend
    else
        pm2 start "$ENGLISH_DIR/server/ecosystem.config.js"
    fi
    pm2 save
    
    log_info "✅ English Server задеплоен и запущен"
}

# Основная логика
case "$1" in
    client)
        update_repo
        deploy_client
        ;;
    server)
        update_repo
        deploy_server
        ;;
    all|"")
        log_info "Деплой всех проектов..."
        update_repo
        deploy_client
        deploy_server
        log_info "✅ Все проекты задеплоены"
        ;;
    *)
        echo "Использование: $0 {client|server|all}"
        echo ""
        echo "Команды:"
        echo "  client   - Деплой только клиента"
        echo "  server   - Деплой только сервера"
        echo "  all      - Деплой всех проектов (по умолчанию)"
        echo ""
        echo "Примеры:"
        echo "  $0 all      - Задеплоить все проекты"
        echo "  $0 server   - Деплой только сервера"
        exit 1
        ;;
esac
