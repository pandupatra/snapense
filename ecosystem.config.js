module.exports = {
  apps: [{
    name: 'bill-tracker',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/bill-tracker',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/www/bill-tracker/logs/error.log',
    out_file: '/var/www/bill-tracker/logs/out.log',
    log_file: '/var/www/bill-tracker/logs/combined.log',
    time: true
  }]
};
