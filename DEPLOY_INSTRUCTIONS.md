# Инструкции по деплою English проектов

## ✅ Что уже готово на сервере:

1. ✅ Созданы директории `/var/www/english/client` и `/var/www/english/backend`
2. ✅ Настроена PM2 конфигурация для backend (порт 4003)
3. ✅ Настроен nginx для проксирования:
   - Клиент: `https://vmi2656319.contaboserver.net/english/`
   - API: `https://vmi2656319.contaboserver.net/english-api/`
4. ✅ Созданы скрипты управления (`deploy.sh`, `manage.sh`)

## 📋 Шаги для деплоя:

### Шаг 1: Копирование файлов с локальной машины

Выполните **С ВАШЕЙ ЛОКАЛЬНОЙ МАШИНЫ** (не на сервере):

```bash
# Копирование клиента
scp -r /Users/pe6e3/Coding/english/client/* root@vmi2656319.contaboserver.net:/var/www/english/client/

# Копирование бэкенда
scp -r /Users/pe6e3/Coding/english/backend/* root@vmi2656319.contaboserver.net:/var/www/english/backend/
```

**Или используйте rsync (рекомендуется):**

```bash
# Копирование клиента
rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  /Users/pe6e3/Coding/english/client/ \
  root@vmi2656319.contaboserver.net:/var/www/english/client/

# Копирование бэкенда
rsync -av --exclude 'node_modules' --exclude '.git' \
  /Users/pe6e3/Coding/english/backend/ \
  root@vmi2656319.contaboserver.net:/var/www/english/backend/
```

### Шаг 2: Деплой на сервере

После копирования файлов, подключитесь к серверу и выполните:

```bash
ssh root@vmi2656319.contaboserver.net
cd /var/www/english
./deploy.sh all
```

Или выполните деплой одной командой с локальной машины:

```bash
ssh root@vmi2656319.contaboserver.net "cd /var/www/english && ./deploy.sh all"
```

## 🚀 Управление проектами

После деплоя используйте скрипт `manage.sh`:

```bash
cd /var/www/english

# Запуск
./manage.sh start

# Остановка
./manage.sh stop

# Перезапуск
./manage.sh restart

# Статус
./manage.sh status

# Логи
./manage.sh logs
```

## 🌐 Доступные URL

После деплоя:

- **Клиент**: https://vmi2656319.contaboserver.net/english/
- **API**: https://vmi2656319.contaboserver.net/english-api/

## 📝 Примечания

- Backend работает на порту **4003**
- PM2 процесс называется `english-backend`
- Логи находятся в `/var/log/pm2/english-backend*.log`

