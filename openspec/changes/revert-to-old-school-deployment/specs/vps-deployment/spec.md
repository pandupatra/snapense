## ADDED Requirements

### Requirement: VPS can be provisioned with a single script
The system SHALL provide a `deploy.sh` script that, when run on a fresh VPS with root access, installs all dependencies and brings the application online.

#### Scenario: Fresh VPS deployment
- **WHEN** the administrator runs `sudo bash deploy.sh <domain> <email>` on a fresh VPS
- **THEN** the script installs Docker, Docker Compose, Nginx, and Certbot
- **AND** configures Nginx as a reverse proxy to port 3000
- **AND** obtains an SSL certificate via Let's Encrypt
- **AND** starts the application via Docker Compose
- **AND** configures the firewall to allow ports 22, 80, and 443

#### Scenario: Idempotent re-run
- **WHEN** `deploy.sh` is run a second time on an already-configured VPS
- **THEN** the script completes without error
- **AND** does not duplicate Nginx configurations or SSL certificates
- **AND** restarts the application with the latest code

---

### Requirement: Application runs via Docker Compose
The system SHALL use Docker Compose to manage the application container lifecycle.

#### Scenario: Container startup
- **WHEN** `docker compose up -d` is executed in the application directory
- **THEN** the application container builds from the `Dockerfile` if needed
- **AND** exposes port 3000 on the host
- **AND** mounts `./.data` on the host to `/app/.data` in the container
- **AND** loads environment variables from `.env.production`
- **AND** the container restarts automatically unless explicitly stopped

#### Scenario: Container teardown
- **WHEN** `docker compose down` is executed
- **THEN** the container stops gracefully
- **AND** the SQLite database in `./.data` remains intact on the host

---

### Requirement: Nginx reverse proxy routes traffic to the application
The system SHALL configure Nginx to proxy all HTTP and HTTPS traffic to the Docker container.

#### Scenario: HTTP request
- **WHEN** a user visits `http://snapense.pandupatra.site`
- **THEN** Nginx redirects the request to HTTPS

#### Scenario: HTTPS request
- **WHEN** a user visits `https://snapense.pandupatra.site`
- **THEN** Nginx terminates SSL and proxies the request to `http://localhost:3000`
- **AND** WebSocket connections are upgraded correctly
- **AND** the `X-Forwarded-Proto`, `X-Forwarded-For`, and `Host` headers are passed to the application

#### Scenario: Static asset caching
- **WHEN** Nginx serves static assets from the application
- **THEN** appropriate cache headers are applied for `.js`, `.css`, and image files

---

### Requirement: SSL certificates are automatically provisioned and renewed
The system SHALL use Certbot with the Nginx plugin to manage SSL certificates.

#### Scenario: Initial certificate issuance
- **WHEN** `deploy.sh` runs Certbot with the domain argument
- **THEN** a valid SSL certificate is obtained from Let's Encrypt
- **AND** Nginx is configured to use the certificate
- **AND** HTTP traffic is redirected to HTTPS

#### Scenario: Certificate renewal
- **WHEN** the Certbot systemd timer triggers (twice daily)
- **THEN** certificates nearing expiration are renewed automatically
- **AND** Nginx is reloaded to apply renewed certificates
