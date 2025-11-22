#!/bin/bash

# Скрипт для копирования файлов с локальной машины на сервер
# Запускайте этот скрипт С ЛОКАЛЬНОЙ МАШИНЫ (не на сервере!)

set -e

SERVER="root@vmi2656319.contaboserver.net"
LOCAL_DIR="/Users/pe6e3/Coding/english"
REMOTE_DIR="/var/www/english"

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Копирование English проектов на сервер...${NC}"

# Проверка существования локальной директории
if [ ! -d "$LOCAL_DIR" ]; then
    echo -e "${YELLOW}Локальная директория не найдена: $LOCAL_DIR${NC}"
    exit 1
fi

# Копирование клиента
if [ -d "$LOCAL_DIR/client" ]; then
    echo -e "${GREEN}Копирование client...${NC}"
    rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
        "$LOCAL_DIR/client/" \
        "$SERVER:$REMOTE_DIR/client/"
else
    echo -e "${YELLOW}Директория client не найдена${NC}"
fi

# Копирование бэкенда
if [ -d "$LOCAL_DIR/backend" ]; then
    echo -e "${GREEN}Копирование backend...${NC}"
    rsync -av --exclude 'node_modules' --exclude '.git' \
        "$LOCAL_DIR/backend/" \
        "$SERVER:$REMOTE_DIR/backend/"
else
    echo -e "${YELLOW}Директория backend не найдена${NC}"
fi

echo -e "${GREEN}✅ Копирование завершено!${NC}"
echo -e "${YELLOW}Теперь на сервере выполните: cd /var/www/english && ./deploy.sh all${NC}"

