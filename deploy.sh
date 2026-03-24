#!/bin/bash

#===============================================================================
# Bill Tracker - VPS Deployment Script
# Usage: sudo bash deploy.sh <domain> <email>
# Example: sudo bash deploy.sh billtracker.example.com admin@example.com
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored messages
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script with sudo: sudo bash deploy.sh"
    exit 1
fi

# Parse arguments
DOMAIN=$1
EMAIL=$2
APP_DIR="/var/www/bill-tracker"
BACKUP_DIR="/var/backups/bill-tracker"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Missing arguments!"
    echo "Usage: sudo bash deploy.sh <domain> <email>"
    echo "Example: sudo bash deploy.sh billtracker.example.com admin@example.com"
    exit 1
fi

print_info "Starting deployment for domain: $DOMAIN"

#===============================================================================
# Step 1: System Update
#===============================================================================
print_info "Step 1: Updating system..."
apt update && apt upgrade -y

#===============================================================================
# Step 2: Install Dependencies
#===============================================================================
print_info "Step 2: Installing Node.js, Nginx, Certbot..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    print_info "Node.js already installed: $(node -v)"
fi

apt install -y nginx certbot python3-certbot-nginx git

#===============================================================================
# Step 3: Install PM2 globally
#===============================================================================
print_info "Step 3: Installing PM2..."
npm install -g pm2

#===============================================================================
# Step 4: Setup Application Directory
#===============================================================================
print_info "Step 4: Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR

# Copy files if deploying from local, otherwise clone from git
if [ -f "$(dirname "$0")/package.json" ]; then
    print_info "Copying files from current directory..."
    cp -r "$(dirname "$0")"/* $APP_DIR/
else
    print_warn "Please copy your application files to $APP_DIR manually"
    print_warn "Or provide your git repository URL to clone"
fi

cd $APP_DIR

#===============================================================================
# Step 5: Install Dependencies
#===============================================================================
print_info "Step 5: Installing Node.js dependencies..."
npm ci --production=false

#===============================================================================
# Step 6: Create Production Environment File
#===============================================================================
print_info "Step 6: Creating production environment file..."

# Generate secure secret
SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

if [ -f ".env.local" ]; then
    print_info "Using existing .env.local as template..."
    cp .env.local .env.production
else
    print_warn "No .env.local found, creating new .env.production..."
    cat > .env.production << EOF
# Better Auth Configuration
BETTER_AUTH_URL=https://$DOMAIN
NEXT_PUBLIC_BETTER_AUTH_URL=https://$DOMAIN
BETTER_AUTH_SECRET=$SECRET

# Google OAuth - Update these values
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
EOF
    print_warn "Please update .env.production with your actual API keys!"
fi

# Update URLs in .env.production
sed -i "s|BETTER_AUTH_URL=.*|BETTER_AUTH_URL=https://$DOMAIN|g" .env.production
sed -i "s|NEXT_PUBLIC_BETTER_AUTH_URL=.*|NEXT_PUBLIC_BETTER_AUTH_URL=https://$DOMAIN|g" .env.production
sed -i "s|GOOGLE_REDIRECT_URI=.*|GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback|g" .env.production
sed -i "s|BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|g" .env.production

print_info "Environment file created at $APP_DIR/.env.production"

#===============================================================================
# Step 7: Build the Application
#===============================================================================
print_info "Step 7: Building Next.js application..."
export NODE_ENV=production
npm run build

#===============================================================================
# Step 8: Setup Database Directory
#===============================================================================
print_info "Step 8: Setting up database directory..."
mkdir -p $APP_DIR/.data
chmod 755 $APP_DIR/.data

#===============================================================================
# Step 9: Start with PM2
#===============================================================================
print_info "Step 9: Starting application with PM2..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bill-tracker',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '$APP_DIR/logs/error.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p $APP_DIR/logs

# Start PM2
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root

#===============================================================================
# Step 10: Configure Nginx
#===============================================================================
print_info "Step 10: Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Increase body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

#===============================================================================
# Step 11: Setup SSL with Certbot
#===============================================================================
print_info "Step 11: Setting up SSL certificate with Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

#===============================================================================
# Step 12: Setup Backup Script
#===============================================================================
print_info "Step 12: Setting up database backup script..."

cat > /usr/local/bin/bill-tracker-backup.sh << EOF
#!/bin/bash
# Backup script for Bill Tracker SQLite database

DATE=\$(date +%Y%m%d_%H%M%S)
DB_PATH="$APP_DIR/.data/db.sqlite"
BACKUP_PATH="$BACKUP_DIR/db_\$DATE.sqlite"

# Create backup
if [ -f "\$DB_PATH" ]; then
    cp "\$DB_PATH" "\$BACKUP_PATH"
    chmod 640 "\$BACKUP_PATH"
    echo "Backup created: \$BACKUP_PATH"
else
    echo "Database file not found at \$DB_PATH"
    exit 1
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sqlite" -type f -mtime +7 -delete
echo "Old backups cleaned up"
EOF

chmod +x /usr/local/bin/bill-tracker-backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null | grep -v "bill-tracker-backup"; echo "0 2 * * * /usr/local/bin/bill-tracker-backup.sh >> /var/log/bill-tracker-backup.log 2>&1") | crontab -

print_info "Backup scheduled: Daily at 2 AM"

#===============================================================================
# Step 13: Setup Firewall (Optional)
#===============================================================================
print_info "Step 13: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_info "UFW firewall configured"
else
    print_warn "UFW not installed. Run 'apt install ufw' if needed."
fi

#===============================================================================
# Deployment Complete!
#===============================================================================
echo ""
echo "============================================"
print_info "Deployment completed successfully!"
echo "============================================"
echo ""
echo "Application URL: https://$DOMAIN"
echo "App Directory:   $APP_DIR"
echo "Database:        $APP_DIR/.data/db.sqlite"
echo "Backup Dir:      $BACKUP_DIR"
echo ""
print_info "PM2 Commands:"
echo "  pm2 status                 - Check app status"
echo "  pm2 logs bill-tracker      - View logs"
echo "  pm2 restart bill-tracker   - Restart app"
echo "  pm2 reload bill-tracker    - Reload app"
echo ""
print_info "Important: Update your Google OAuth redirect URI to:"
echo "  https://$DOMAIN/api/auth/google/callback"
echo ""
print_info "Test your application at: https://$DOMAIN"
