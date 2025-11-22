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

## Настройка GitHub Actions (обязательно для автоматического деплоя)

Для автоматического деплоя через GitHub Actions нужно настроить секреты в репозитории:

1. Перейдите в настройки репозитория: `Settings` → `Secrets and variables` → `Actions`
2. Нажмите `New repository secret` и добавьте следующие секреты:

### Необходимые секреты:

#### 1. SSH_HOST
- **Значение**: IP адрес или домен вашего сервера
- **Пример**: `195.7.6.68` или `vmi2656319.contaboserver.net`

#### 2. SSH_USER
- **Значение**: имя пользователя для SSH подключения
- **Пример**: `root`

#### 3. SSH_KEY
- **Значение**: приватный SSH ключ для подключения к серверу
- **Как получить**:
  ```bash
  # На сервере выполните:
  cat ~/.ssh/id_ed25519
  # или если используется RSA:
  cat ~/.ssh/id_rsa
  ```
- **Важно**: Скопируйте весь вывод, включая строки:
  - `-----BEGIN OPENSSH PRIVATE KEY-----` (или `-----BEGIN RSA PRIVATE KEY-----`)
  - Содержимое ключа
  - `-----END OPENSSH PRIVATE KEY-----` (или `-----END RSA PRIVATE KEY-----`)

#### 4. SSH_PORT (опционально)
- **Значение**: порт SSH (по умолчанию 22)
- **Пример**: `22`

### Проверка SSH ключа

Убедитесь, что публичный ключ добавлен в `~/.ssh/authorized_keys` на сервере:
```bash
# На сервере проверьте:
cat ~/.ssh/authorized_keys | grep "$(cat ~/.ssh/id_ed25519.pub | cut -d' ' -f2)"
```

Если ключа нет, добавьте его:
```bash
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

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

