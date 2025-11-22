#!/bin/bash

# Скрипт автоматического деплоя при push
# Показывает актуальную версию и перезапускает PM2

set -e

ENGLISH_DIR="/var/www/english"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_version() {
    echo -e "${BLUE}[VERSION]${NC} $1"
}

log_success() {
    echo -e "${CYAN}[SUCCESS]${NC} $1"
}

# Получаем информацию о текущей версии
get_version_info() {
    cd "$ENGLISH_DIR"
    
    # Получаем последний коммит
    LAST_COMMIT=$(git log -1 --format="%H")
    LAST_COMMIT_SHORT=$(git log -1 --format="%h")
    LAST_COMMIT_MSG=$(git log -1 --format="%s")
    LAST_COMMIT_DATE=$(git log -1 --format="%cd" --date=format:"%Y-%m-%d %H:%M:%S")
    LAST_COMMIT_AUTHOR=$(git log -1 --format="%an")
    CURRENT_BRANCH=$(git branch --show-current)
    
    echo ""
    log_version "═══════════════════════════════════════════════════════════"
    log_version "📦 АКТУАЛЬНАЯ ВЕРСИЯ ПРОЕКТА"
    log_version "═══════════════════════════════════════════════════════════"
    log_version "Коммит:     $LAST_COMMIT_SHORT"
    log_version "Полный ID:  $LAST_COMMIT"
    log_version "Сообщение:  $LAST_COMMIT_MSG"
    log_version "Автор:      $LAST_COMMIT_AUTHOR"
    log_version "Дата:       $LAST_COMMIT_DATE"
    log_version "Ветка:      $CURRENT_BRANCH"
    log_version "═══════════════════════════════════════════════════════════"
    echo ""
}

# Обновление кода из репозитория
update_code() {
    log_info "🔄 Обновление кода из репозитория..."
    
    cd "$ENGLISH_DIR"
    
    # Сохраняем текущую ветку
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Обновляем код
    git fetch origin
    git pull origin "$CURRENT_BRANCH" || {
        log_error "Ошибка при обновлении кода"
        exit 1
    }
    
    log_success "✅ Код обновлен"
}

# Деплой сервера
deploy_server() {
    log_info "🔄 Деплой сервера..."
    
    cd "$ENGLISH_DIR/server"
    
    # Установка зависимостей
    if [ -f "package.json" ]; then
        log_info "Установка зависимостей сервера..."
        npm install --legacy-peer-deps --production --silent 2>&1 | grep -E "(added|removed|changed)" || true
        log_success "✅ Зависимости установлены"
    fi
    
    # Перезапуск через PM2
    log_info "Перезапуск PM2 процесса 'english-backend'..."
    if pm2 list | grep -q "english-backend"; then
        pm2 restart english-backend --update-env
        log_success "✅ Сервер перезапущен"
    else
        log_warn "Процесс english-backend не найден, запускаем..."
        pm2 start "$ENGLISH_DIR/server/ecosystem.config.js"
        pm2 save
        log_success "✅ Сервер запущен"
    fi
    
    # Показываем статус PM2
    echo ""
    log_info "📊 Статус PM2 процесса 'english-backend':"
    pm2 info english-backend | grep -E "(status|uptime|memory|cpu|restarts|pid)" | head -6
    echo ""
}

# Деплой клиента (опционально)
deploy_client() {
    log_info "🔄 Деплой клиента..."
    
    cd "$ENGLISH_DIR/client"
    
    # Установка зависимостей
    if [ -f "package.json" ]; then
        log_info "Установка зависимостей клиента..."
        npm install --legacy-peer-deps --silent 2>&1 | grep -E "(added|removed|changed)" || true
        
        # Сборка проекта
        if grep -q "\"build\"" package.json; then
            log_info "Сборка клиента..."
            npm run build --silent
            log_success "✅ Клиент собран"
        fi
    fi
}

# Отправка уведомления о деплое
send_deploy_notification() {
    log_info "📤 Отправка уведомления о деплое..."
    
    cd "$ENGLISH_DIR"
    
    # Получаем информацию о деплое
    LAST_COMMIT=$(git log -1 --format="%H")
    LAST_COMMIT_SHORT=$(git log -1 --format="%h")
    LAST_COMMIT_MSG=$(git log -1 --format="%s")
    LAST_COMMIT_BODY=$(git log -1 --format="%B" | sed '/^$/d' | head -20)
    LAST_COMMIT_DATE=$(git log -1 --format="%cd" --date=format:"%Y-%m-%d %H:%M:%S")
    LAST_COMMIT_AUTHOR=$(git log -1 --format="%an")
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Получаем статус PM2
    PM2_INFO=$(pm2 info english-backend 2>/dev/null | grep -E "(status|uptime|memory|cpu|restarts)" | head -5 | tr '\n' '; ' || echo "status: unknown")
    PM2_STATUS=$(echo "$PM2_INFO" | sed 's/; $//')
    
    # Получаем информацию о сервере
    SERVER_HOSTNAME=$(hostname)
    SERVER_IP=$(hostname -I | awk '{print $1}')
    DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Формируем сообщение (экранируем для JSON)
    MESSAGE="Деплой English произведён успешно!

📦 Информация о версии:
• Коммит: $LAST_COMMIT_SHORT ($LAST_COMMIT)
• Сообщение: $LAST_COMMIT_MSG
• Автор: $LAST_COMMIT_AUTHOR
• Дата коммита: $LAST_COMMIT_DATE
• Ветка: $CURRENT_BRANCH

📝 Текст последнего коммита:
$LAST_COMMIT_BODY

🖥️ Информация о сервере:
• Хост: $SERVER_HOSTNAME
• IP: $SERVER_IP
• Время деплоя: $DEPLOY_TIME

📊 Статус PM2:
• $PM2_STATUS

✅ Все компоненты успешно обновлены и перезапущены."

    # Экранируем сообщение для JSON
    # Заменяем обратные слеши, кавычки и переносы строк
    MESSAGE_ESCAPED=$(printf '%s' "$MESSAGE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//')
    
    # Формируем JSON
    JSON_DATA="{\"massage\":\"$MESSAGE_ESCAPED\"}"
    
    # Отправляем POST запрос
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$JSON_DATA" \
        "https://stage.istransit.kz/api/terminals/v01/send_log/" 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        log_success "✅ Уведомление отправлено успешно (HTTP $HTTP_CODE)"
    else
        log_warn "⚠️  Не удалось отправить уведомление (HTTP $HTTP_CODE)"
        if [ -n "$BODY" ]; then
            log_warn "Ответ сервера: $BODY"
        fi
    fi
}

# Основная логика
main() {
    echo ""
    log_info "🚀 Запуск автоматического деплоя..."
    echo ""
    
    # Обновляем код
    update_code
    
    # Показываем версию
    get_version_info
    
    # Деплой сервера
    deploy_server
    
    # Деплой клиента
    deploy_client
    
    log_success "✅ Автоматический деплой завершен успешно!"
    echo ""
    
    # Отправляем уведомление о деплое
    send_deploy_notification
}

# Запуск
main

