# CI/CD Setup for Snapense

This document explains how to set up automatic deployment to your VPS using GitHub Actions.

## Overview

When you push changes to the `main` branch, GitHub Actions will automatically:
1. Connect to your VPS via SSH
2. Pull the latest code changes
3. Install dependencies
4. Build the application
5. Restart the PM2 process

## Prerequisites

- VPS with Snapense already deployed
- GitHub repository with your code
- SSH access to your VPS

## Setup Instructions

### Step 1: Generate SSH Key Pair (if you don't have one)

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

### Step 2: Add SSH Public Key to VPS

Copy the public key to your VPS:

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps-ip
```

Or manually add it:

```bash
cat ~/.ssh/github_actions.pub
# Copy the output and add it to ~/.ssh/authorized_keys on your VPS
```

### Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or domain | `123.45.67.89` or `your-domain.com` |
| `VPS_USER` | SSH username | `root` or `ubuntu` |
| `VPS_SSH_KEY` | Private SSH key (contents of `github_actions` file) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port (optional, defaults to 22) | `22` |

**Important:** For `VPS_SSH_KEY`, copy the **entire** contents of your private key file:

```bash
cat ~/.ssh/github_actions
```

Copy everything including the `-----BEGIN` and `-----END` lines.

### Step 4: Verify Deployment

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
pm2 logs snapense
```

## Troubleshooting

### Permission Denied (publickey)

- Verify `VPS_SSH_KEY` contains the complete private key
- Ensure the public key is in `~/.ssh/authorized_keys` on your VPS
- Check `VPS_USER` and `VPS_HOST` are correct

### Port Connection Issues

- If you use a custom SSH port, add `VPS_PORT` secret
- Ensure your firewall allows SSH connections from GitHub's IPs

### Build Failures

- Check that Node.js 20+ is installed on your VPS
- Verify environment variables are set in `/var/www/snapense/.env`
- Check PM2 logs: `pm2 logs snapense`

### Manual Deployment

If GitHub Actions fails, you can always deploy manually:

```bash
ssh user@your-vps-ip
cd /var/www/snapense
bash update.sh
```

## Security Best Practices

1. **Use a dedicated SSH key** for GitHub Actions (not your personal key)
2. **Limit SSH key permissions** - the key should only be able to restart the app
3. **Rotate keys regularly** - generate new keys periodically
4. **Monitor deployment logs** - check GitHub Actions logs for suspicious activity
5. **Use branch protection** - require PR reviews before merging to main

## Advanced: SSH Key with Restricted Commands

For better security, you can restrict the SSH key to only run specific commands:

Add to `~/.ssh/authorized_keys` on your VPS:

```
command="cd /var/www/snapense && bash update.sh" ssh-ed25519 AAAA... github-actions
```

This limits the key to only run the update script.
