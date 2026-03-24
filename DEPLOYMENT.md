# Bill Tracker - Deployment Guide

## Quick VPS Deployment

### Prerequisites
- Ubuntu VPS (20.04+) with root/sudo access
- Domain name pointed to your VPS IP
- Google OAuth credentials

### Steps

#### 1. Upload Files to VPS
```bash
# From your local machine
scp -r ./ user@your-vps-ip:/tmp/bill-tracker

# Or if using git
git clone <your-repo-url> /var/www/bill-tracker
```

#### 2. Run Deployment Script
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to app directory
cd /var/www/bill-tracker

# Make script executable and run
chmod +x deploy.sh
sudo bash deploy.sh your-domain.com your-email@example.com
```

#### 3. Update Google OAuth
Go to [Google Cloud Console](https://console.cloud.google.com/) and add:
```
https://your-domain.com/api/auth/google/callback
```

## Manual Commands

### View Logs
```bash
pm2 logs bill-tracker
```

### Restart App
```bash
pm2 restart bill-tracker
```

### Update App
```bash
cd /var/www/bill-tracker
git pull  # or copy new files
npm ci
npm run build
pm2 restart bill-tracker
```

### Backup Database
```bash
/usr/local/bin/bill-tracker-backup.sh
```

## Environment Variables

Edit `/var/www/bill-tracker/.env.production`:

```bash
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
GEMINI_API_KEY=<your-api-key>
GEMINI_MODEL=gemini-2.5-flash
```

## Troubleshooting

### App not starting
```bash
pm2 logs bill-tracker --lines 50
```

### Nginx issues
```bash
sudo nginx -t          # Test config
sudo systemctl reload nginx
```

### Database permissions
```bash
sudo chmod 755 /var/www/bill-tracker/.data
sudo chmod 644 /var/www/bill-tracker/.data/db.sqlite
```

### SSL issues
```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```
