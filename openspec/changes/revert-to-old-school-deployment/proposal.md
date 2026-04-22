## Why

The project recently migrated to Coolify for deployment, which removed the original self-managed deployment infrastructure (`deploy.sh`, `update.sh`, GitHub Actions workflow, PM2 config). However, Coolify introduces unnecessary abstraction and platform dependency for a single-VPS personal project. Reverting to "old school" self-managed deployment restores full control over the server while keeping the benefits of Docker's reproducible builds.

## What Changes

- **Restore `deploy.sh`**: One-time VPS setup script that installs Docker, Nginx, Certbot, configures SSL, firewall, and starts the app via Docker Compose
- **Restore `update.sh`**: Quick redeploy script for manual updates (`git pull` → `docker compose up --build -d`)
- **Restore `.github/workflows/deploy.yml`**: Push-to-deploy automation via GitHub Actions SSHing into the VPS and running `update.sh`
- **Enhance `docker-compose.yaml`**: Add `env_file` support, bind mount for `.data` (SQLite persistence on host), and proper restart policy
- **Add Nginx reverse proxy config**: SSL termination, WebSocket support, static asset caching, proxy to Docker container on port 3000
- **Add database backup script**: Daily cron job to backup SQLite database with 7-day retention
- **Remove Coolify-specific artifacts**: The existing `Dockerfile` and `docker-compose.yaml` are kept but enhanced; no Coolify-specific files remain

## Capabilities

### New Capabilities
- `vps-deployment`: One-time automated setup of a VPS with Docker, Nginx, SSL (Let's Encrypt), firewall, and application deployment
- `automated-deployment`: Push-to-deploy workflow where pushing to `main` automatically builds and deploys the application via GitHub Actions
- `database-backup`: Automated daily backups of the SQLite database with rotation and retention policies

### Modified Capabilities
- *(none — no existing spec-level behavior changes)*

## Impact

- **Infrastructure**: Moves from Coolify-managed Docker deployment to self-managed Docker + Nginx on VPS
- **Deployment workflow**: Developers push to `main` → GitHub Actions SSHs to VPS → runs `update.sh` → Docker builds and restarts container
- **Docker usage**: Existing multi-stage `Dockerfile` is preserved and leveraged; `docker-compose.yaml` is enhanced with production-ready settings
- **Database access**: SQLite database moves from Docker named volume to host bind mount (`./.data:/app/.data`) for easier backup and direct access
- **Process management**: Docker Compose handles container lifecycle instead of PM2 or Coolify
- **SSL**: Certbot + Nginx handles SSL instead of Coolify's built-in reverse proxy
