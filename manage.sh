#!/bin/bash

# Скрипт управления English проектами

case "$1" in
    start)
        echo "🚀 Запуск English Server..."
        cd /var/www/english/server
        pm2 start ecosystem.config.js
        pm2 save
        echo "✅ Server запущен"
        ;;
    stop)
        echo "🛑 Остановка English Server..."
        pm2 stop english-backend
        echo "✅ Server остановлен"
        ;;
    restart)
        echo "🔄 Перезапуск English Server..."
        pm2 restart english-backend
        echo "✅ Server перезапущен"
        ;;
    status)
        echo "📊 Статус English проектов:"
        pm2 status english-backend
        ;;
    logs)
        echo "📋 Логи English Server:"
        pm2 logs english-backend --lines 50
        ;;
    deploy)
        echo "🚀 Деплой English проектов..."
        cd /var/www/english
        ./deploy.sh all
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs|deploy}"
        echo ""
        echo "Команды:"
        echo "  start   - Запустить backend"
        echo "  stop    - Остановить backend"
        echo "  restart - Перезапустить backend"
        echo "  status  - Показать статус"
        echo "  logs    - Показать логи"
        echo "  deploy  - Задеплоить все проекты"
        echo ""
        echo "🌐 Клиент: https://vmi2656319.contaboserver.net/english/"
        echo "🔧 API: https://vmi2656319.contaboserver.net/english-api/"
        exit 1
        ;;
esac

