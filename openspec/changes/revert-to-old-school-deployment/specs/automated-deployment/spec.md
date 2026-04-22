## ADDED Requirements

### Requirement: Pushing to main triggers automatic deployment
The system SHALL provide a GitHub Actions workflow that deploys the application to the VPS on every push to the `main` branch.

#### Scenario: Successful push-to-deploy
- **WHEN** a commit is pushed to the `main` branch
- **THEN** GitHub Actions connects to the VPS via SSH
- **AND** executes `cd /var/www/snapense && bash update.sh`
- **AND** the workflow reports success if the deployment completes

#### Scenario: Deployment failure
- **WHEN** the `update.sh` script exits with a non-zero status
- **THEN** the GitHub Actions workflow reports failure
- **AND** the previous running container remains active (Docker Compose does not stop the old container until the new one is healthy)

---

### Requirement: VPS can be updated manually with a single script
The system SHALL provide an `update.sh` script on the VPS that updates the application to the latest code.

#### Scenario: Manual update
- **WHEN** an administrator runs `bash update.sh` in `/var/www/snapense`
- **THEN** the script pulls the latest changes from the `main` branch via git
- **AND** runs `docker compose up --build -d` to rebuild and restart the container
- **AND** prunes unused Docker images to free disk space
- **AND** outputs the deployment status

#### Scenario: GitHub Actions triggered update
- **WHEN** GitHub Actions runs `update.sh` via SSH
- **THEN** the behavior is identical to a manual run
- **AND** the script exits with code 0 on success or non-zero on failure

---

### Requirement: GitHub Actions uses secure VPS credentials
The system SHALL require VPS connection details to be stored as GitHub repository secrets.

#### Scenario: Missing secrets
- **WHEN** the workflow runs but required secrets are missing
- **THEN** the workflow fails immediately with a clear error message

#### Scenario: Successful authentication
- **WHEN** the workflow runs with valid secrets
- **THEN** the SSH connection to the VPS is established successfully
- **AND** the deployment script executes

### Requirement: Deployment does not leave the application in a broken state
The system SHALL ensure the application remains running if a deployment fails.

#### Scenario: Build failure
- **WHEN** `docker compose up --build` fails during the build phase
- **THEN** the existing running container continues to serve traffic
- **AND** Nginx continues to proxy requests to the old container
