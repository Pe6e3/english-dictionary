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
