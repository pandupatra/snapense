## 1. Docker Compose Enhancement

- [x] 1.1 Update `docker-compose.yaml` to add `env_file: .env.production`, bind mount `./.data:/app/.data`, and `restart: unless-stopped`
- [x] 1.2 Verify the enhanced `docker-compose.yaml` works locally with `docker compose up --build -d`
- [x] 1.3 Ensure `.data` directory on the host persists the SQLite database across container restarts

## 2. Deployment Scripts

- [x] 2.1 Create `deploy.sh`: one-time VPS setup script (Docker install, Nginx config, Certbot SSL, firewall, `docker compose up -d`)
- [x] 2.2 Create `update.sh`: quick redeploy script (`git pull`, `docker compose up --build -d`, `docker image prune -f`)
- [x] 2.3 Make both scripts executable (`chmod +x`) and test idempotency of `deploy.sh`
- [x] 2.4 Add `.env.production` to `.gitignore` if not already present

## 3. Nginx & SSL Configuration

- [x] 3.1 Add Nginx site configuration in `deploy.sh` for reverse proxy to `localhost:3000` with WebSocket support
- [x] 3.2 Configure `client_max_body_size 10M` and proxy timeout headers in Nginx
- [x] 3.3 Integrate Certbot in `deploy.sh` for automatic SSL certificate issuance
- [x] 3.4 Verify Certbot auto-renewal is enabled via systemd timer
- [x] 4.1 Create `.github/workflows/deploy.yml` with SSH-based push-to-deploy
- [x] 4.2 Configure workflow to run `update.sh` on the VPS using repository secrets (`VPS_HOST`, `VPS_USER`, `VPS_PASSWORD` or `VPS_SSH_KEY`)
- [x] 4.3 Add `script_stop: true` and failure handling so broken deployments don't take the site down
- [ ] 4.4 Test workflow with a dummy commit after secrets are configured
- [x] 5.1 Create backup script (`/usr/local/bin/snapense-backup.sh`) that copies `.data/db.sqlite` to `/var/backups/snapense/`
- [x] 5.2 Add 7-day retention logic to the backup script (`find ... -mtime +7 -delete`)
- [x] 5.3 Install backup script via `deploy.sh` and schedule it in crontab for daily 2:00 AM execution
- [ ] 5.4 Verify backup creation and rotation work correctly
- [x] 6.1 Update `CI_CD_SETUP.md` or create `DEPLOYMENT.md` with new setup instructions (secrets, domain, VPS prerequisites)
- [x] 6.2 Remove any remaining Coolify-specific configuration or documentation references
- [x] 6.3 Verify `.gitignore` excludes `.env`, `.env.production`, `logs/`, and `.data`
- [ ] 6.4 End-to-end test: push to `main`, verify GitHub Actions deploys, verify site is live with SSL
