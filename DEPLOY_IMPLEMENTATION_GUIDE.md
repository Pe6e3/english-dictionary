# Полное руководство по реализации автоматического деплоя с уведомлениями

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Компоненты системы](#компоненты-системы)
3. [Детальная реализация](#детальная-реализация)
4. [Настройка для нового проекта](#настройка-для-нового-проекта)
5. [Адаптация под другие проекты](#адаптация-под-другие-проекты)
6. [Устранение неполадок](#устранение-неполадок)

---

## 🏗️ Обзор архитектуры

Система автоматического деплоя состоит из следующих компонентов:

```
┌─────────────────┐
│  GitHub Push    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions   │ ──► Отправляет POST запрос на webhook
│  (CI/CD)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webhook API    │ ──► Проверяет секретный ключ
│  (/api/deploy)  │     Запускает скрипт деплоя
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ auto-deploy.sh  │ ──► Обновляет код
│                 │     Устанавливает зависимости
│                 │     Перезапускает PM2
│                 │     Собирает клиент
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ send_deploy_    │ ──► Формирует сообщение
│ notification()  │     Отправляет в Telegram
└─────────────────┘
```

### Преимущества такой архитектуры:

- ✅ **Безопасность**: Секретный ключ защищает webhook от несанкционированного доступа
- ✅ **Надежность**: Деплой выполняется на сервере, где есть все необходимые инструменты
- ✅ **Гибкость**: Легко адаптировать под разные проекты
- ✅ **Информативность**: Автоматические уведомления о статусе деплоя
- ✅ **Независимость**: Не требует SSH доступа из GitHub Actions

---

## 🧩 Компоненты системы

### 1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Триггер: push в ветки `main` или `master`
- Действие: отправка POST запроса на webhook endpoint

### 2. Webhook Endpoint (`server.js`)
- Endpoint: `POST /api/deploy`
- Проверка: секретный ключ из переменной окружения
- Действие: запуск скрипта `auto-deploy.sh` в фоновом режиме

### 3. Скрипт автоматического деплоя (`auto-deploy.sh`)
- Обновление кода из Git репозитория
- Установка зависимостей (сервер и клиент)
- Перезапуск PM2 процесса
- Сборка клиентского приложения
- Отправка уведомления о деплое

### 4. Git Hook (`.git/hooks/post-merge`)
- Автоматический запуск деплоя после `git pull`
- Альтернативный способ деплоя вручную

---

## 🔧 Детальная реализация

### 1. GitHub Actions Workflow

**Файл**: `.github/workflows/deploy.yml`

```yaml
name: Auto Deploy

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    name: Deploy to Server
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Display version info
        run: |
          echo "═══════════════════════════════════════════════════════════"
          echo "📦 ИНФОРМАЦИЯ О ВЕРСИИ"
          echo "═══════════════════════════════════════════════════════════"
          echo "Коммит:     $(git log -1 --format='%h')"
          echo "Полный ID:  $(git log -1 --format='%H')"
          echo "Сообщение:  $(git log -1 --format='%s')"
          echo "Автор:      $(git log -1 --format='%an')"
          echo "Дата:       $(git log -1 --format='%cd' --date=format:'%Y-%m-%d %H:%M:%S')"
          echo "Ветка:      $(git branch --show-current)"
          echo "═══════════════════════════════════════════════════════════"
      
      - name: Deploy via webhook
        id: deploy_webhook
        run: |
          if [ -n "${{ secrets.DEPLOY_WEBHOOK_URL }}" ] && [ -n "${{ secrets.DEPLOY_SECRET }}" ]; then
            echo "🚀 Запуск деплоя через webhook..."
            RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
              -H "Content-Type: application/json" \
              -d "{\"secret\":\"${{ secrets.DEPLOY_SECRET }}\"}" \
              "${{ secrets.DEPLOY_WEBHOOK_URL }}")
            HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
            BODY=$(echo "$RESPONSE" | sed '$d')
            
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
              echo "✅ Деплой запущен успешно (HTTP $HTTP_CODE)"
              echo "$BODY"
              echo ""
              echo "ℹ️  Уведомление о деплое будет отправлено сервером после завершения деплоя"
            else
              echo "❌ Ошибка деплоя (HTTP $HTTP_CODE)"
              echo "$BODY"
              exit 1
            fi
          else
            echo "❌ Webhook не настроен (DEPLOY_WEBHOOK_URL и DEPLOY_SECRET)"
            exit 1
          fi
        continue-on-error: true
```

**Ключевые моменты:**
- `fetch-depth: 0` - получаем полную историю Git для доступа к коммитам
- `continue-on-error: true` - позволяет workflow продолжить даже при ошибке
- Проверка наличия секретов перед отправкой запроса
- Обработка HTTP кодов ответа

### 2. Webhook Endpoint

**Файл**: `server/server.js` (или аналогичный файл вашего сервера)

```javascript
// Webhook для автоматического деплоя
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'your-secret-key-change-me';

app.post('/api/deploy', (req, res) => {
  const { secret } = req.body;
  
  // Проверяем секретный ключ
  if (secret !== DEPLOY_SECRET) {
    return res.status(401).json({ error: 'Неверный секретный ключ' });
  }
  
  // Запускаем деплой в фоновом режиме
  const { exec } = require('child_process');
  const deployScript = '/var/www/your-project/auto-deploy.sh';
  
  exec(`bash ${deployScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка деплоя:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при выполнении деплоя',
        message: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Деплой запущен',
      output: stdout 
    });
  });
});
```

**Важные детали:**
- Секретный ключ хранится в переменной окружения `DEPLOY_SECRET`
- Скрипт запускается асинхронно через `exec()`
- Ответ отправляется сразу, не дожидаясь завершения деплоя
- Ошибки логируются в консоль сервера

### 3. Скрипт автоматического деплоя

**Файл**: `auto-deploy.sh`

#### Структура скрипта:

```bash
#!/bin/bash

# 1. Настройка переменных и функций логирования
# 2. Функция get_version_info() - получение информации о версии
# 3. Функция update_code() - обновление кода из Git
# 4. Функция deploy_server() - деплой сервера
# 5. Функция deploy_client() - деплой клиента
# 6. Функция send_deploy_notification() - отправка уведомления
# 7. Функция main() - основная логика
```

#### Ключевые функции:

**Логирование:**
```bash
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${CYAN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}
```

**Получение информации о версии:**
```bash
get_version_info() {
    cd "$PROJECT_DIR"
    
    LAST_COMMIT=$(git log -1 --format="%H")
    LAST_COMMIT_SHORT=$(git log -1 --format="%h")
    LAST_COMMIT_MSG=$(git log -1 --format="%s")
    LAST_COMMIT_DATE=$(git log -1 --format="%cd" --date=format:"%Y-%m-%d %H:%M:%S")
    LAST_COMMIT_AUTHOR=$(git log -1 --format="%an")
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Вывод информации
}
```

**Обновление кода:**
```bash
update_code() {
    log_info "🔄 Обновление кода из репозитория..."
    
    cd "$PROJECT_DIR"
    CURRENT_BRANCH=$(git branch --show-current)
    
    git fetch origin
    git pull origin "$CURRENT_BRANCH" || {
        log_error "Ошибка при обновлении кода"
        exit 1
    }
    
    log_success "✅ Код обновлен"
}
```

**Деплой сервера:**
```bash
deploy_server() {
    log_info "🔄 Деплой сервера..."
    
    cd "$PROJECT_DIR/server"
    
    # Установка зависимостей
    if [ -f "package.json" ]; then
        log_info "Установка зависимостей сервера..."
        npm install --legacy-peer-deps --production --silent
        log_success "✅ Зависимости установлены"
    fi
    
    # Перезапуск через PM2
    log_info "Перезапуск PM2 процесса..."
    if pm2 list | grep -q "your-process-name"; then
        pm2 restart your-process-name --update-env
        log_success "✅ Сервер перезапущен"
    else
        log_warn "Процесс не найден, запускаем..."
        pm2 start "$PROJECT_DIR/server/ecosystem.config.js"
        pm2 save
        log_success "✅ Сервер запущен"
    fi
}
```

**Отправка уведомления:**
```bash
send_deploy_notification() {
    log_info "📤 Отправка уведомления о деплое..."
    
    cd "$PROJECT_DIR"
    
    # Получаем информацию о деплое
    LAST_COMMIT=$(git log -1 --format="%H")
    LAST_COMMIT_SHORT=$(git log -1 --format="%h")
    LAST_COMMIT_MSG=$(git log -1 --format="%s")
    LAST_COMMIT_BODY=$(git log -1 --format="%B" | sed '/^$/d' | head -20)
    LAST_COMMIT_DATE=$(git log -1 --format="%cd" --date=format:"%Y-%m-%d %H:%M:%S")
    LAST_COMMIT_AUTHOR=$(git log -1 --format="%an")
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Получаем статус PM2
    PM2_STATUS_LINE=""
    if pm2 list | grep -q "your-process-name"; then
        PM2_INFO=$(pm2 info your-process-name 2>/dev/null)
        
        STATUS=$(echo "$PM2_INFO" | grep -E "^│ status" | awk -F'│' '{print $3}' | xargs)
        UPTIME=$(echo "$PM2_INFO" | grep -E "^│ uptime" | awk -F'│' '{print $3}' | xargs)
        RESTARTS=$(echo "$PM2_INFO" | grep -E "^│ restarts" | awk -F'│' '{print $3}' | xargs)
        
        PM2_LIST=$(pm2 list --no-color | grep "your-process-name" | head -1)
        if [ -n "$PM2_LIST" ]; then
            CPU=$(echo "$PM2_LIST" | awk -F'│' '{gsub(/^[[:space:]]*|[[:space:]]*$/,"",$10); print $10}')
            MEMORY=$(echo "$PM2_LIST" | awk -F'│' '{gsub(/^[[:space:]]*|[[:space:]]*$/,"",$11); print $11}')
        fi
        
        PM2_STATUS_LINE="• Статус: ${STATUS:-unknown}
• Время работы: $UPTIME
• Перезапусков: $RESTARTS
• Память: $MEMORY
• CPU: $CPU"
    else
        PM2_STATUS_LINE="• Процесс не найден"
    fi
    
    # Получаем информацию о сервере
    SERVER_HOSTNAME=$(hostname)
    SERVER_IP=$(hostname -I | awk '{print $1}')
    DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Формируем сообщение
    MESSAGE="Деплой проекта произведён успешно!

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
$PM2_STATUS_LINE

✅ Все компоненты успешно обновлены и перезапущены."

    # Формируем JSON с помощью Python
    if command -v python3 &> /dev/null; then
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
        "https://your-api-endpoint.com/api/notifications" 2>&1)
    
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
```

### 4. Git Hook (опционально)

**Файл**: `.git/hooks/post-merge`

```bash
#!/bin/bash

# Git hook для автоматического деплоя после git pull
PROJECT_DIR="/var/www/your-project"

# Запускаем скрипт автоматического деплоя
if [ -f "$PROJECT_DIR/auto-deploy.sh" ]; then
    "$PROJECT_DIR/auto-deploy.sh"
else
    echo "⚠️  Скрипт auto-deploy.sh не найден!"
    exit 1
fi
```

**Важно**: Сделайте файл исполняемым:
```bash
chmod +x .git/hooks/post-merge
```

---

## 🚀 Настройка для нового проекта

### Шаг 1: Подготовка сервера

1. **Установите необходимые инструменты:**
```bash
# Node.js и npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Git
sudo apt-get install -y git

# Python3 (для форматирования JSON)
sudo apt-get install -y python3
```

2. **Создайте директорию проекта:**
```bash
sudo mkdir -p /var/www/your-project
sudo chown $USER:$USER /var/www/your-project
cd /var/www/your-project
```

3. **Клонируйте репозиторий:**
```bash
git clone https://github.com/your-username/your-repo.git .
```

### Шаг 2: Настройка PM2

1. **Создайте файл `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'your-process-name',
    script: 'server.js',
    cwd: '/var/www/your-project/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DEPLOY_SECRET: process.env.DEPLOY_SECRET || 'change-me-to-secure-random-key'
    },
    error_file: '/var/log/pm2/your-project-error.log',
    out_file: '/var/log/pm2/your-project-out.log',
    log_file: '/var/log/pm2/your-project.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

2. **Запустите процесс:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Шаг 3: Создание скрипта деплоя

1. **Создайте файл `auto-deploy.sh`:**
```bash
#!/bin/bash

# Адаптируйте переменные под ваш проект
PROJECT_DIR="/var/www/your-project"
PROCESS_NAME="your-process-name"
NOTIFICATION_URL="https://your-api-endpoint.com/api/notifications"

# Скопируйте код из раздела "Детальная реализация"
# и адаптируйте под ваш проект
```

2. **Сделайте скрипт исполняемым:**
```bash
chmod +x auto-deploy.sh
```

3. **Протестируйте скрипт:**
```bash
./auto-deploy.sh
```

### Шаг 4: Настройка Webhook Endpoint

1. **Добавьте endpoint в ваш сервер:**
```javascript
// В файле server.js (или аналогичном)
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'your-secret-key-change-me';

app.post('/api/deploy', (req, res) => {
  const { secret } = req.body;
  
  if (secret !== DEPLOY_SECRET) {
    return res.status(401).json({ error: 'Неверный секретный ключ' });
  }
  
  const { exec } = require('child_process');
  const deployScript = '/var/www/your-project/auto-deploy.sh';
  
  exec(`bash ${deployScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка деплоя:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при выполнении деплоя',
        message: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Деплой запущен',
      output: stdout 
    });
  });
});
```

2. **Перезапустите сервер:**
```bash
pm2 restart your-process-name
```

### Шаг 5: Генерация секретного ключа

```bash
# Сгенерируйте случайный ключ
openssl rand -hex 32

# Сохраните его в переменную окружения
export DEPLOY_SECRET="ваш-сгенерированный-ключ"

# Добавьте в ecosystem.config.js или .env файл
```

### Шаг 6: Настройка GitHub Actions

1. **Создайте директорию для workflows:**
```bash
mkdir -p .github/workflows
```

2. **Создайте файл `.github/workflows/deploy.yml`:**
```yaml
# Скопируйте код из раздела "Детальная реализация"
# и адаптируйте под ваш проект
```

3. **Настройте секреты в GitHub:**
   - Перейдите в `Settings` → `Secrets and variables` → `Actions`
   - Добавьте секреты:
     - `DEPLOY_WEBHOOK_URL`: `https://your-domain.com/api/deploy`
     - `DEPLOY_SECRET`: ваш сгенерированный ключ

### Шаг 7: Настройка Git Hook (опционально)

1. **Создайте файл `.git/hooks/post-merge`:**
```bash
# Скопируйте код из раздела "Детальная реализация"
```

2. **Сделайте файл исполняемым:**
```bash
chmod +x .git/hooks/post-merge
```

---

## 🔄 Адаптация под другие проекты

### Для проектов без клиента

Если у вас только серверная часть, удалите функцию `deploy_client()`:

```bash
main() {
    update_code
    get_version_info
    deploy_server
    send_deploy_notification
}
```

### Для проектов с Docker

Замените перезапуск PM2 на перезапуск контейнеров:

```bash
deploy_server() {
    log_info "🔄 Деплой сервера..."
    
    cd "$PROJECT_DIR"
    
    # Останавливаем и удаляем старые контейнеры
    docker-compose down
    
    # Собираем и запускаем новые контейнеры
    docker-compose up -d --build
    
    log_success "✅ Сервер перезапущен"
}
```

### Для проектов с Python

Адаптируйте установку зависимостей:

```bash
deploy_server() {
    log_info "🔄 Деплой сервера..."
    
    cd "$PROJECT_DIR/server"
    
    # Активация виртуального окружения
    source venv/bin/activate
    
    # Установка зависимостей
    pip install -r requirements.txt
    
    # Перезапуск через systemd или supervisor
    sudo systemctl restart your-service
    
    log_success "✅ Сервер перезапущен"
}
```

### Для проектов с другим менеджером процессов

Замените PM2 на ваш менеджер:

```bash
# Для systemd
deploy_server() {
    sudo systemctl restart your-service
}

# Для supervisor
deploy_server() {
    sudo supervisorctl restart your-service
}

# Для forever
deploy_server() {
    forever restart your-service
}
```

### Для проектов с другой системой уведомлений

Адаптируйте функцию `send_deploy_notification()`:

```bash
# Для Slack
send_deploy_notification() {
    curl -X POST \
        -H 'Content-type: application/json' \
        --data "{\"text\":\"$MESSAGE\"}" \
        "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}

# Для Discord
send_deploy_notification() {
    curl -X POST \
        -H 'Content-type: application/json' \
        --data "{\"content\":\"$MESSAGE\"}" \
        "https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
}

# Для Email (через sendmail)
send_deploy_notification() {
    echo "$MESSAGE" | mail -s "Деплой проекта" your-email@example.com
}
```

---

## 🐛 Устранение неполадок

### Проблема: Webhook не отвечает

**Решение:**
1. Проверьте, что сервер запущен: `pm2 status`
2. Проверьте логи: `pm2 logs your-process-name`
3. Убедитесь, что endpoint доступен: `curl https://your-domain.com/api/deploy`
4. Проверьте переменную окружения `DEPLOY_SECRET`

### Проблема: GitHub Actions не может отправить запрос

**Решение:**
1. Проверьте секреты в GitHub: `Settings` → `Secrets and variables` → `Actions`
2. Убедитесь, что URL webhook правильный
3. Проверьте логи GitHub Actions в разделе `Actions`

### Проблема: Скрипт деплоя не выполняется

**Решение:**
1. Проверьте права на выполнение: `chmod +x auto-deploy.sh`
2. Проверьте путь к скрипту в webhook endpoint
3. Проверьте логи сервера: `pm2 logs`

### Проблема: Уведомление не отправляется

**Решение:**
1. Проверьте URL API уведомлений
2. Проверьте формат JSON (используйте Python для проверки)
3. Проверьте логи скрипта деплоя
4. Убедитесь, что `curl` доступен на сервере

### Проблема: PM2 процесс не перезапускается

**Решение:**
1. Проверьте имя процесса: `pm2 list`
2. Убедитесь, что процесс существует: `pm2 describe your-process-name`
3. Проверьте права доступа к файлу `ecosystem.config.js`

---

## 📝 Чеклист для нового проекта

- [ ] Установлены необходимые инструменты (Node.js, PM2, Git, Python3)
- [ ] Создана директория проекта
- [ ] Клонирован репозиторий
- [ ] Настроен PM2 (`ecosystem.config.js`)
- [ ] Создан скрипт `auto-deploy.sh`
- [ ] Скрипт сделан исполняемым (`chmod +x`)
- [ ] Добавлен webhook endpoint в сервер
- [ ] Сгенерирован секретный ключ
- [ ] Секретный ключ добавлен в переменные окружения
- [ ] Создан GitHub Actions workflow
- [ ] Настроены секреты в GitHub (DEPLOY_WEBHOOK_URL, DEPLOY_SECRET)
- [ ] Протестирован деплой вручную
- [ ] Протестирован деплой через push
- [ ] Проверена отправка уведомлений

---

## 🔐 Безопасность

### Рекомендации:

1. **Секретный ключ:**
   - Используйте длинный случайный ключ (минимум 32 символа)
   - Храните в переменных окружения, не в коде
   - Регулярно обновляйте ключ

2. **Webhook endpoint:**
   - Используйте HTTPS для webhook
   - Ограничьте доступ по IP (если возможно)
   - Логируйте все запросы к endpoint

3. **GitHub Secrets:**
   - Не коммитьте секреты в репозиторий
   - Используйте GitHub Secrets для хранения
   - Ограничьте доступ к секретам

4. **Скрипт деплоя:**
   - Ограничьте права доступа: `chmod 750 auto-deploy.sh`
   - Проверяйте целостность скрипта перед выполнением
   - Логируйте все действия

---

## 📚 Дополнительные ресурсы

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)

---

## 📞 Поддержка

Если у вас возникли вопросы или проблемы при настройке, проверьте:

1. Логи PM2: `pm2 logs`
2. Логи сервера: `tail -f /var/log/pm2/your-project.log`
3. Логи GitHub Actions в разделе `Actions`
4. Логи скрипта деплоя (выводятся в консоль)

---

**Версия документации:** 1.0  
**Последнее обновление:** 2025-11-22

