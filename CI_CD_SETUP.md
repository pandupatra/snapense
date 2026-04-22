# CI/CD Setup for Snapense

This document explains how to set up automatic deployment to your VPS using GitHub Actions.

## Overview

When you push changes to the `main` branch, GitHub Actions will automatically:
1. Connect to your VPS via SSH
2. Pull the latest code changes
3. Rebuild and restart the Docker container
4. Clean up unused Docker images

For full deployment instructions (including initial VPS setup), see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- VPS with Snapense already deployed via `deploy.sh`
- GitHub repository with your code
- SSH access to your VPS

## Setup Instructions

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or domain | `123.45.67.89` or `snapense.pandupatra.site` |
| `VPS_USER` | SSH username | `root` or `ubuntu` |
| `VPS_PASSWORD` | SSH password | `your-secure-password` |
| `VPS_PORT` | SSH port (optional, defaults to 22) | `22` |

### Step 2: Verify Deployment

1. Commit and push changes to the `main` branch:

```bash
git add .
git commit -m "Test CI/CD deployment"
git push origin main
```

2. Go to GitHub Actions tab in your repository to see the deployment in progress

3. Once complete, check your VPS:

```bash
ssh user@your-vps-ip
cd /var/www/snapense
docker compose ps
docker compose logs -f
```

## Troubleshooting

### Permission Denied (password)

- Verify `VPS_PASSWORD` is correct
- Check `VPS_USER` and `VPS_HOST` are correct
- Ensure your VPS allows password authentication

### Port Connection Issues

- If you use a custom SSH port, add `VPS_PORT` secret
- Ensure your firewall allows SSH connections from GitHub's IPs

### Build Failures

- Check Docker is installed: `docker --version`
- Verify environment variables are set in `/var/www/snapense/.env.production`
- Check container logs: `docker compose logs`

### Manual Deployment

If GitHub Actions fails, you can always deploy manually:

```bash
ssh user@your-vps-ip
cd /var/www/snapense
bash update.sh
```

## Security Best Practices

1. **Use a dedicated user** for GitHub Actions (not root if possible)
2. **Limit SSH permissions** - restrict to only run `update.sh`
3. **Rotate credentials regularly** - update passwords periodically
4. **Monitor deployment logs** - check GitHub Actions logs for suspicious activity
5. **Use branch protection** - require PR reviews before merging to main

## Advanced: SSH with Restricted Commands

For better security, you can restrict the SSH session to only run specific commands:

Add to `~/.ssh/authorized_keys` on your VPS (if using SSH keys):

```
command="cd /var/www/snapense && bash update.sh" ssh-ed25519 AAAA... github-actions
```

This limits the key to only run the update script.
