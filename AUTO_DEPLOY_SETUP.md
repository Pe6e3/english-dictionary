# Настройка автоматического деплоя

Автоматический деплой настроен для работы при каждом push в репозиторий.

## Что настроено

1. **Скрипт автоматического деплоя** (`auto-deploy.sh`)
   - Обновляет код из репозитория
   - Показывает актуальную версию (коммит, автор, дата, сообщение)
   - Устанавливает зависимости
   - Перезапускает PM2 процесс `english-backend`

2. **Git hook** (`.git/hooks/post-merge`)
   - Автоматически запускается после `git pull`
   - Вызывает скрипт `auto-deploy.sh`

3. **GitHub Actions workflow** (`.github/workflows/deploy.yml`)
   - Автоматически запускается при push в ветку `main` или `master`
   - Отправляет POST запрос на webhook endpoint для запуска деплоя

4. **Webhook endpoint** (`/api/deploy`)
   - Доступен на сервере для автоматического деплоя
   - Требует секретный ключ для безопасности
   - Запускает скрипт `auto-deploy.sh` в фоновом режиме

## Настройка GitHub Actions (обязательно для автоматического деплоя)

Для автоматического деплоя через GitHub Actions нужно настроить секреты в репозитории:

1. Перейдите в настройки репозитория: `Settings` → `Secrets and variables` → `Actions`
2. Нажмите `New repository secret` и добавьте следующие секреты:

### Необходимые секреты:

#### 1. DEPLOY_WEBHOOK_URL (обязательно)
- **Значение**: URL webhook endpoint для деплоя
- **Пример**: `https://vmi2656319.contaboserver.net/english-api/api/deploy`
- **Формат**: `https://ваш-домен/english-api/api/deploy`
- **Как узнать**: URL формируется как `https://ваш-домен/english-api/api/deploy`

#### 2. DEPLOY_SECRET (обязательно)
- **Значение**: секретный ключ для webhook endpoint
- **Текущий ключ**: `8f205f34959c04b6ad880caea68d3ee516168b65b13bc34710734efcd0c7c879`
- **Как изменить**:
  ```bash
  # На сервере сгенерируйте новый ключ:
  openssl rand -hex 32
  
  # Установите переменную окружения:
  export DEPLOY_SECRET="новый-ключ-здесь"
  
  # Перезапустите PM2:
  pm2 restart english-backend --update-env
  ```
- **Важно**: Используйте сложный случайный ключ для безопасности

## Использование

### Автоматический деплой при push

После настройки GitHub Actions, при каждом push в ветку `main`:
1. GitHub Actions автоматически отправит POST запрос на webhook endpoint
2. Сервер запустит скрипт `auto-deploy.sh` в фоновом режиме
3. Скрипт обновит код, покажет актуальную версию и перезапустит PM2 процесс

### Ручной деплой

Если нужно запустить деплой вручную на сервере:

```bash
cd /var/www/english
./auto-deploy.sh
```

Или через git pull (автоматически запустится hook):

```bash
cd /var/www/english
git pull origin main
```

## Что показывает скрипт

При каждом деплое отображается:
- 📦 **Актуальная версия проекта**
  - Коммит (короткий и полный ID)
  - Сообщение коммита
  - Автор
  - Дата и время
  - Текущая ветка
- 📊 **Статус PM2 процесса**
  - Статус (online/offline)
  - Время работы (uptime)
  - Использование памяти
  - Использование CPU
  - Количество перезапусков

## Проверка работы

После push проверьте:
1. GitHub Actions: перейдите в `Actions` в репозитории и проверьте выполнение workflow
2. На сервере: проверьте логи PM2
   ```bash
   pm2 logs english-backend
   ```
3. Статус процесса:
   ```bash
   pm2 status
   pm2 info english-backend
   ```

## Отключение автоматического деплоя

Если нужно временно отключить автоматический деплой:

1. Переименуйте hook:
   ```bash
   mv /var/www/english/.git/hooks/post-merge /var/www/english/.git/hooks/post-merge.disabled
   ```

2. Или отключите GitHub Actions workflow:
   - Переименуйте файл `.github/workflows/deploy.yml` в `.github/workflows/deploy.yml.disabled`

## Восстановление

Для восстановления автоматического деплоя:

```bash
mv /var/www/english/.git/hooks/post-merge.disabled /var/www/english/.git/hooks/post-merge
chmod +x /var/www/english/.git/hooks/post-merge
```

