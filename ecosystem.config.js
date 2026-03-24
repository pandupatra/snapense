module.exports = {
  apps: [{
    name: 'snapense',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/snapense',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/www/snapense/logs/error.log',
    out_file: '/var/www/snapense/logs/out.log',
    log_file: '/var/www/snapense/logs/combined.log',
    time: true
  }]
};
