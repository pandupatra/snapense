## Why

Snapense is currently deployed via self-managed Docker + Nginx on a single VPS, with a previous failed attempt at Coolify deployment that was reverted. The app uses SQLite (better-sqlite3) as its database, which creates persistence risks in containerized environments and ties the app to a single-instance deployment model. Moving to Coolify with Nixpacks for all apps consolidates infrastructure management, and migrating to PostgreSQL via Coolify's built-in database resource eliminates the SQLite persistence problem while following PaaS best practices.

## What Changes

- Add `nixpacks.toml` configuration for Coolify deployment, specifying build dependencies (Python, Make, GCC) needed for native module compilation and custom start command
- **BREAKING**: Migrate database layer from SQLite (better-sqlite3) to PostgreSQL (node-postgres/pg)
- Replace `better-sqlite3` dependency with `pg` and `drizzle-orm/node-postgres` driver
- Update `src/db/schema.ts` from SQLite column types (`sqliteTable`, `integer` timestamps, `real`) to PostgreSQL equivalents (`pgTable`, `timestamp`, `numeric`)
- Update `src/db/index.ts` to use PostgreSQL connection via `DATABASE_URL` environment variable
- Update `src/db/migrate.ts` to use PostgreSQL migrator
- Update `drizzle.config.ts` dialect and credentials
- Remove `postinstall` script (`npm rebuild better-sqlite3`) from `package.json`
- Remove Dockerfile, docker-compose.yaml, deploy.sh, and update.sh (no longer needed for Coolify)
- Add database migration strategy (one-time SQLite → PostgreSQL data migration)

## Capabilities

### New Capabilities
- `nixpacks-build-config`: Nixpacks build configuration for Coolify deployment including native module build dependencies and start command
- `postgres-database`: PostgreSQL database integration replacing SQLite, including connection setup, schema migration, and environment variable configuration

### Modified Capabilities
<!-- No existing specs are being modified at the requirements level -->

## Impact

- **Code**: `src/db/schema.ts`, `src/db/index.ts`, `src/db/migrate.ts`, `drizzle.config.ts`, `package.json`, `next.config.js`
- **Dependencies removed**: `better-sqlite3`, `@types/better-sqlite3`
- **Dependencies added**: `pg`, `@types/pg`, `drizzle-orm/node-postgres`
- **Infrastructure**: Deployment shifts from self-managed Docker to Coolify + Nixpacks; database shifts from file-based SQLite to Coolify-managed PostgreSQL container
- **Data**: Existing `.data/db.sqlite` data requires a one-time migration to PostgreSQL
- **Environment variables**: `DATABASE_URL` replaces file-based database path; Coolify injects this automatically when linking a PostgreSQL resource