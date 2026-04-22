## Context

**Current State**: The project uses Coolify for deployment. The `Dockerfile` and `docker-compose.yaml` were added for Coolify compatibility. Previous manual deployment infrastructure (`deploy.sh`, `update.sh`, GitHub Actions workflow, PM2 config, `DEPLOYMENT.md`) was removed in commit `f443c66`.

**Previous State**: Before Coolify, the app ran on a VPS with Node.js 22, PM2, Nginx, Certbot, and SQLite. Deployment was automated via GitHub Actions SSHing into the VPS to run `update.sh` (git pull → npm ci → build → pm2 restart).

**Project Constraints**:
- Single-VPS personal project (no need for orchestration platforms)
- SQLite database (single file, no separate DB server)
- Next.js 16 with `output: 'standalone'`
- `better-sqlite3` native dependency (historically problematic with Node version mismatches)
- Domain: `snapense.pandupatra.site`

## Goals / Non-Goals

**Goals:**
- Restore self-managed deployment with full control over the VPS
- Leverage the existing multi-stage `Dockerfile` for reproducible builds
- Enable push-to-deploy from GitHub Actions
- Ensure SQLite database persists across container restarts and is easily accessible
- Automate SSL certificate renewal and daily database backups

**Non-Goals:**
- Replacing the existing `Dockerfile` (it works well)
- Adding a separate database server (Postgres, MySQL)
- Multi-server or load-balanced deployment
- Container orchestration (Kubernetes, Swarm)
- Replacing Nginx with a different reverse proxy

## Decisions

### 1. Keep Docker, Drop Coolify
**Decision**: Use Docker Compose directly on the VPS instead of Coolify.
**Rationale**: The existing multi-stage `Dockerfile` solves the `better-sqlite3` compilation issue elegantly by building in a controlled environment. Dropping Docker would reintroduce native dependency pain. Coolify adds unnecessary abstraction for a single-container app.
**Alternatives considered**: 
- Pure PM2 + Node.js (old approach): Rejected because `better-sqlite3` architecture mismatches caused repeated deployment failures.
- Coolify: Rejected because it adds platform dependency and opacity.

### 2. Bind Mount for SQLite Data
**Decision**: Use a host bind mount (`./.data:/app/.data`) instead of a Docker named volume.
**Rationale**: 
- The database file is directly accessible on the host for debugging (`sqlite3 .data/db.sqlite`)
- Backups are trivial (`cp .data/db.sqlite /var/backups/...`)
- No need to hunt through `/var/lib/docker/volumes/`
**Alternatives considered**:
- Named volume (`snapense_db:/app/.data`): Rejected because backup and debugging require Docker-specific tooling.

### 3. Nginx as Reverse Proxy (not Caddy)
**Decision**: Use Nginx + Certbot for SSL termination instead of Caddy.
**Rationale**: 
- The original setup used Nginx, so the user is familiar with it
- Certbot is well-documented and widely supported
- Nginx configuration is explicit and easy to customize
**Alternatives considered**:
- Caddy: Rejected to avoid introducing a new tool the user isn't familiar with.

### 4. GitHub Actions for Push-to-Deploy
**Decision**: Use GitHub Actions with SSH (password or key-based) to trigger `update.sh` on the VPS.
**Rationale**: 
- Same approach as the original setup, proven to work
- Minimal configuration (host, user, password/key as secrets)
- The VPS does the Docker build, which is acceptable for a personal project
**Alternatives considered**:
- Webhook listener on VPS: Rejected as over-engineered for this use case.
- Docker registry + pull: Rejected because building on the VPS is simpler for a single-project server.

### 5. `update.sh` as the Deployment Entrypoint
**Decision**: The GitHub Actions workflow and manual deploys both call `update.sh`.
**Rationale**: 
- Single source of truth for the deploy sequence
- Easy to test manually (`ssh vps && bash update.sh`)
- Can be restricted in `~/.ssh/authorized_keys` for security

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Docker build on VPS is slow** | Acceptable for personal project; can add Docker layer caching later if needed |
| **SQLite does not support concurrent writes from multiple containers** | Only one container runs at a time; Docker Compose ensures this |
| **SSL certificate expiration** | Certbot auto-renewal is configured; Nginx reloads on renewal |
| **GitHub Actions secret exposure** | Use dedicated SSH key or strong password; restrict key to only run `update.sh` |
| **Downtime during deployment** | Docker Compose `up --build -d` replaces container; ~5-10 second gap |
| **Data loss if `.data` directory is deleted** | Daily backups to `/var/backups/snapense/` with 7-day retention |

## Migration Plan

1. **Prepare VPS**: Ensure Docker and Docker Compose are installed
2. **Run `deploy.sh`**: Sets up Nginx, SSL, firewall, and starts the app
3. **Verify**: Check `https://snapense.pandupatra.site` works
4. **Configure GitHub Secrets**: Add VPS connection details to repository secrets
5. **Test push-to-deploy**: Push a change to `main` and verify deployment
6. **Remove Coolify**: Stop/remove Coolify-managed resources if still running

**Rollback Strategy**:
- Keep Coolify resources untouched until verification is complete
- If issues arise, revert DNS or proxy config to point back to Coolify
- The `deploy.sh` script is idempotent for Nginx/Certbot but creates new infrastructure

## Open Questions

1. **SSH authentication method**: Password vs SSH key? The old workflow used password auth (`secrets.VPS_PASSWORD`). Should we stick with that or switch to SSH keys for better security?
2. **Domain verification**: Is `snapense.pandupatra.site` still pointing to the VPS IP, or does it need DNS updates after leaving Coolify?
3. **Coolify cleanup**: Should `deploy.sh` or a separate script handle stopping and removing Coolify-managed containers and volumes?
