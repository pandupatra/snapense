## ADDED Requirements

### Requirement: Nixpacks build configuration file
The system SHALL provide a `nixpacks.toml` file at the project root that configures the Nixpacks build for Coolify deployment. The configuration SHALL specify the Node.js build provider with a custom start command that runs database migrations before starting the Next.js server.

#### Scenario: Coolify builds the application using Nixpacks
- **WHEN** Coolify triggers a build for the Snapense application
- **THEN** Nixpacks SHALL auto-detect the Node.js/Next.js stack and execute the build using the configuration in `nixpacks.toml`

### Requirement: Database migration on startup
The start command SHALL execute `npm run db:migrate` before `node server.js` to ensure database schema is up to date before the application serves requests.

#### Scenario: Application starts after deployment
- **WHEN** the application container starts
- **THEN** the start command SHALL first run `npm run db:migrate` to apply pending migrations
- **THEN** the start command SHALL run `node server.js` to start the Next.js server

### Requirement: Port configuration
The Nixpacks configuration SHALL set the `PORT` environment variable and the application SHALL listen on the port specified by the `PORT` environment variable, defaulting to 3000.

#### Scenario: Coolify assigns a custom port
- **WHEN** Coolify sets the `PORT` environment variable to a value other than 3000
- **THEN** the application SHALL listen on that port

#### Scenario: No custom port assigned
- **WHEN** the `PORT` environment variable is not set
- **THEN** the application SHALL listen on port 3000

### Requirement: Removal of Docker deployment files
The system SHALL remove the following files as they are no longer needed for Coolify deployment: `Dockerfile`, `docker-compose.yaml`, `deploy.sh`, `update.sh`, `DEPLOYMENT.md`, `CI_CD_SETUP.md`.

#### Scenario: Repository cleanup after migration
- **WHEN** the Coolify deployment is configured and working
- **THEN** the repository SHALL NOT contain Docker-specific deployment files (`Dockerfile`, `docker-compose.yaml`, `deploy.sh`, `update.sh`, `DEPLOYMENT.md`, `CI_CD_SETUP.md`)

### Requirement: Removal of SQLite build dependencies
The `package.json` SHALL NOT contain a `postinstall` script for rebuilding native modules. The `better-sqlite3` and `@types/better-sqlite3` dependencies SHALL be removed.

#### Scenario: Clean Nixpacks build without native module compilation
- **WHEN** Nixpacks builds the application
- **THEN** the build SHALL NOT require Python, Make, or GCC for better-sqlite3 compilation
- **THEN** the build SHALL succeed without a `postinstall` step that rebuilds native modules