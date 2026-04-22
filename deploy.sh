#!/bin/bash

#===============================================================================
# Snapense - VPS Deployment Script (Docker Edition)
# Usage: sudo bash deploy.sh <domain> <email>
# Example: sudo bash deploy.sh snapense.pandupatra.site admin@example.com
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
APP_DIR="/var/www/snapense"
BACKUP_DIR="/var/backups/snapense"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Missing arguments!"
    echo "Usage: sudo bash deploy.sh <domain> <email>"
    echo "Example: sudo bash deploy.sh snapense.pandupatra.site admin@example.com"
    exit 1
fi

print_info "Starting deployment for domain: $DOMAIN"

#===============================================================================
# Step 1: System Update
#===============================================================================
print_info "Step 1: Updating system..."
apt update && apt upgrade -y

#===============================================================================
# Step 2: Install Docker & Docker Compose
#===============================================================================
print_info "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash -
    usermod -aG docker root
    print_info "Docker installed successfully"
else
    print_info "Docker already installed: $(docker --version)"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
fi

print_info "Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo 'plugin not found')"

#===============================================================================
# Step 3: Install Nginx & Certbot
#===============================================================================
print_info "Step 3: Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx git

#===============================================================================
# Step 4: Setup Application Directory
#===============================================================================
print_info "Step 4: Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p $APP_DIR/.data
mkdir -p $APP_DIR/logs

# Copy files if deploying from local, otherwise clone from git
if [ -f "$(dirname "$0")/package.json" ]; then
    print_info "Copying files from current directory..."
    cp -r "$(dirname "$0")"/* $APP_DIR/
else
    print_warn "Please copy your application files to $APP_DIR manually"
    print_warn "Or clone from your git repository:"
    print_warn "  git clone <repo-url> $APP_DIR"
fi

cd $APP_DIR

#===============================================================================
# Step 5: Create Production Environment File
#===============================================================================
print_info "Step 5: Setting up environment file..."

# Generate secure secret
SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

if [ -f ".env.production" ]; then
    print_info ".env.production already exists, keeping it"
else
    print_warn "Creating new .env.production..."
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

# Update domain URLs in .env.production if they changed
sed -i "s|BETTER_AUTH_URL=.*|BETTER_AUTH_URL=https://$DOMAIN|g" .env.production 2>/dev/null || true
sed -i "s|NEXT_PUBLIC_BETTER_AUTH_URL=.*|NEXT_PUBLIC_BETTER_AUTH_URL=https://$DOMAIN|g" .env.production 2>/dev/null || true
sed -i "s|GOOGLE_REDIRECT_URI=.*|GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback|g" .env.production 2>/dev/null || true

print_info "Environment file configured at $APP_DIR/.env.production"

#===============================================================================
# Step 6: Build & Start Application with Docker Compose
#===============================================================================
print_info "Step 6: Building and starting application with Docker Compose..."

# Ensure docker compose can read .env.production
chmod 600 .env.production

docker compose up --build -d

print_info "Application container started"

#===============================================================================
# Step 7: Configure Nginx
#===============================================================================
print_info "Step 7: Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name {{DOMAIN}};

    # Increase body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

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

# Replace domain placeholder
sed -i "s/{{DOMAIN}}/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

#===============================================================================
# Step 8: Setup SSL with Certbot
#===============================================================================
print_info "Step 8: Setting up SSL certificate with Let's Encrypt..."

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    print_info "SSL certificate already exists for $DOMAIN"
else
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
    print_info "SSL certificate obtained"
fi

# Ensure Certbot auto-renewal is active
if systemctl is-active --quiet certbot.timer; then
    print_info "Certbot auto-renewal timer is active"
else
    systemctl enable --now certbot.timer
    print_info "Certbot auto-renewal timer enabled"
fi

#===============================================================================
# Step 9: Setup Backup Script
#===============================================================================
print_info "Step 9: Setting up database backup script..."

cat > /usr/local/bin/snapense-backup.sh << 'EOF'
#!/bin/bash
# Backup script for Snapense SQLite database

set -e

APP_DIR="/var/www/snapense"
BACKUP_DIR="/var/backups/snapense"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="$APP_DIR/.data/db.sqlite"
BACKUP_PATH="$BACKUP_DIR/db_${DATE}.sqlite"

# Create backup
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_PATH"
    chmod 640 "$BACKUP_PATH"
    echo "[$(date)] Backup created: $BACKUP_PATH"
else
    echo "[$(date)] Database file not found at $DB_PATH"
    exit 1
fi

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "db_*.sqlite" -type f -mtime +7 -delete
echo "[$(date)] Old backups cleaned up"
EOF

chmod +x /usr/local/bin/snapense-backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null | grep -v "snapense-backup"; echo "0 2 * * * /usr/local/bin/snapense-backup.sh >> /var/log/snapense-backup.log 2>&1") | crontab -

print_info "Backup scheduled: Daily at 2 AM"

#===============================================================================
# Step 10: Setup Firewall
#===============================================================================
print_info "Step 10: Configuring firewall..."
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
print_info "Docker Commands:"
echo "  docker compose ps          - Check container status"
echo "  docker compose logs -f     - View logs"
echo "  docker compose restart     - Restart app"
echo "  docker compose up --build -d  - Rebuild and restart"
echo ""
print_info "Important: Update your Google OAuth redirect URI to:"
echo "  https://$DOMAIN/api/auth/google/callback"
echo ""
print_info "Test your application at: https://$DOMAIN"
