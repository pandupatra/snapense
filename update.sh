#!/bin/bash

#===============================================================================
# Snapense - Update Script
# Usage: bash update.sh
# Run this after making changes to the codebase
#===============================================================================

set -e

APP_DIR="/var/www/snapense"
cd $APP_DIR

echo "=========================================="
echo "  Updating Snapense Application"
echo "=========================================="
echo ""

# Pull latest changes if using git
if [ -d .git ]; then
    echo "Pulling latest changes from git..."
    git pull
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build application
echo "Building application..."
npm run build

# Restart PM2
echo "Restarting application..."
pm2 restart snapense

echo ""
echo "=========================================="
echo "  Update completed successfully!"
echo "=========================================="
echo ""
echo "Check logs with: pm2 logs snapense"
