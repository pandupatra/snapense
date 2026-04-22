#!/bin/bash

#===============================================================================
# Snapense - Update Script (Docker Edition)
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
    git pull origin main
fi

# Rebuild and restart with Docker Compose
echo "Building and restarting application..."
docker compose up --build -d

# Clean up unused images to free disk space
echo "Pruning unused Docker images..."
docker image prune -f

echo ""
echo "=========================================="
echo "  Update completed successfully!"
echo "=========================================="
echo ""
echo "Check logs with: docker compose logs -f"
echo "Check status with: docker compose ps"
