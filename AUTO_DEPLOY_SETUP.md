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
   - Подключается к серверу по SSH и запускает деплой

## Настройка GitHub Actions (опционально)

Для автоматического деплоя через GitHub Actions нужно настроить секреты в репозитории:

1. Перейдите в настройки репозитория: `Settings` → `Secrets and variables` → `Actions`
2. Добавьте следующие секреты:
   - `SSH_HOST` - IP адрес или домен вашего сервера
   - `SSH_USER` - имя пользователя для SSH (обычно `root`)
   - `SSH_KEY` - приватный SSH ключ для подключения к серверу

### Получение SSH ключа

Если у вас уже есть SSH ключ на сервере:
```bash
cat ~/.ssh/id_ed25519
# или
cat ~/.ssh/id_rsa
```

Скопируйте весь вывод (включая `-----BEGIN` и `-----END`) и добавьте как секрет `SSH_KEY`.

## Использование

### Автоматический деплой при push

После настройки GitHub Actions, при каждом push в ветку `main`:
1. GitHub Actions автоматически подключится к серверу
2. Запустит скрипт `auto-deploy.sh`
3. Покажет актуальную версию
4. Перезапустит PM2 процесс

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

