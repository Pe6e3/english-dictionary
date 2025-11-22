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
    
    # Получаем информацию о текущем состоянии
    OLD_COMMIT=$(git log -1 --format="%h")
    log_info "Текущий коммит: $OLD_COMMIT"
    
    # Обновляем код с повторными попытками (на случай если изменения еще не синхронизировались)
    MAX_RETRIES=5
    RETRY_DELAY=5
    RETRY_COUNT=0
    FETCH_SUCCESS=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$FETCH_SUCCESS" = false ]; do
        log_info "Попытка fetch (попытка $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        
        if git fetch origin; then
            FETCH_SUCCESS=true
            log_success "✅ Fetch выполнен успешно"
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                log_warn "⚠️  Fetch не удался, повтор через ${RETRY_DELAY} секунд..."
                sleep $RETRY_DELAY
            else
                log_error "Ошибка при fetch после $MAX_RETRIES попыток"
                exit 1
            fi
        fi
    done
    
    # Проверяем, есть ли новые коммиты
    NEW_COMMITS=$(git log HEAD..origin/"$CURRENT_BRANCH" --oneline 2>/dev/null | wc -l)
    if [ "$NEW_COMMITS" -gt 0 ]; then
        log_info "Найдено новых коммитов: $NEW_COMMITS"
        git pull origin "$CURRENT_BRANCH" || {
            log_error "Ошибка при pull"
            exit 1
        }
        NEW_COMMIT=$(git log -1 --format="%h")
        log_success "✅ Код обновлен: $OLD_COMMIT → $NEW_COMMIT"
    else
        # Всегда делаем pull, даже если кажется что нет новых коммитов
        # Это нужно для случаев, когда fetch не подтянул все изменения
        log_info "Выполняем pull для гарантии актуальности..."
        git pull origin "$CURRENT_BRANCH" || {
            log_warn "⚠️  Pull не выполнен, но продолжаем (возможно уже актуально)"
        }
        NEW_COMMIT=$(git log -1 --format="%h")
        if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
            log_success "✅ Код обновлен: $OLD_COMMIT → $NEW_COMMIT"
        else
            log_success "✅ Код актуален (коммит: $OLD_COMMIT)"
        fi
    fi
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
            # Используем npm run build вместо прямого вызова vite для правильного PATH
            npm run build --silent 2>&1 | grep -v "npm WARN" || true
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
    
    # Получаем статус PM2 и форматируем для Telegram
    PM2_STATUS_LINE=""
    if pm2 list | grep -q "english-backend"; then
        # Извлекаем информацию из pm2 info
        PM2_INFO=$(pm2 info english-backend 2>/dev/null)
        
        # Парсим статус, uptime и restarts из pm2 info
        STATUS=$(echo "$PM2_INFO" | grep -E "^│ status" | awk -F'│' '{print $3}' | xargs)
        UPTIME=$(echo "$PM2_INFO" | grep -E "^│ uptime" | awk -F'│' '{print $3}' | xargs)
        RESTARTS=$(echo "$PM2_INFO" | grep -E "^│ restarts" | awk -F'│' '{print $3}' | xargs)
        
        # Получаем память и CPU из pm2 list (таблица)
        # Формат: id │ name │ namespace │ version │ mode │ pid │ uptime │ ↺ │ status │ cpu │ memory │ user │ watching │
        PM2_LIST=$(pm2 list --no-color | grep "english-backend" | head -1)
        if [ -n "$PM2_LIST" ]; then
            # Извлекаем CPU (10-я колонка) и Memory (11-я колонка) из таблицы
            CPU=$(echo "$PM2_LIST" | awk -F'│' '{gsub(/^[[:space:]]*|[[:space:]]*$/,"",$10); print $10}')
            MEMORY=$(echo "$PM2_LIST" | awk -F'│' '{gsub(/^[[:space:]]*|[[:space:]]*$/,"",$11); print $11}')
        fi
        
        # Формируем строку статуса с переносами строк
        PM2_STATUS_LINE="• Статус: ${STATUS:-unknown}"
        [ -n "$UPTIME" ] && PM2_STATUS_LINE="$PM2_STATUS_LINE
• Время работы: $UPTIME"
        [ -n "$RESTARTS" ] && PM2_STATUS_LINE="$PM2_STATUS_LINE
• Перезапусков: $RESTARTS"
        [ -n "$MEMORY" ] && PM2_STATUS_LINE="$PM2_STATUS_LINE
• Память: $MEMORY"
        [ -n "$CPU" ] && PM2_STATUS_LINE="$PM2_STATUS_LINE
• CPU: $CPU"
    else
        PM2_STATUS_LINE="• Процесс не найден"
    fi
    
    # Получаем информацию о сервере
    SERVER_HOSTNAME=$(hostname)
    SERVER_IP=$(hostname -I | awk '{print $1}')
    DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Формируем сообщение (экранируем для JSON)
    MESSAGE="Деплой English произведён успешно!

📦 Информация о версии:
• Коммит: $LAST_COMMIT_SHORT
• Автор: $LAST_COMMIT_AUTHOR
• Дата коммита: $LAST_COMMIT_DATE
• Ветка: $CURRENT_BRANCH

📝 Текст последнего коммита:
<b>$LAST_COMMIT_BODY</b>

🖥️ Информация о сервере:
• Хост: $SERVER_HOSTNAME
• IP: $SERVER_IP
• Время деплоя: $DEPLOY_TIME

📊 Статус PM2:
$PM2_STATUS_LINE

✅ Все компоненты успешно обновлены и перезапущены."

    # Используем Python для правильного формирования JSON
    if command -v python3 &> /dev/null; then
        # Сохраняем сообщение во временный файл для надежной передачи
        MSG_TMP=$(mktemp)
        printf '%s' "$MESSAGE" > "$MSG_TMP"
        JSON_DATA=$(python3 -c "import json; f=open('$MSG_TMP', 'r', encoding='utf-8'); msg=f.read(); f.close(); print(json.dumps({'message': msg}, ensure_ascii=False))" 2>/dev/null)
        rm -f "$MSG_TMP"
    else
        # Fallback: простое экранирование
        MESSAGE_ESCAPED=$(printf '%s' "$MESSAGE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{gsub(/\n/, "\\n"); print}')
        JSON_DATA="{\"message\":\"$MESSAGE_ESCAPED\"}"
    fi
    
    # Проверяем, что JSON не пустой
    if [ -z "$JSON_DATA" ] || [ "${#JSON_DATA}" -lt 20 ]; then
        log_warn "⚠️  JSON данные пусты или слишком короткие, пропускаем отправку"
        return
    fi
    
    # Отправляем POST запрос
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        --data-raw "$JSON_DATA" \
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

