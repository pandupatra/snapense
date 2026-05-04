## Context

Snapense is a Next.js 16 personal finance app currently deployed via self-managed Docker + Nginx on a VPS. The database is SQLite (better-sqlite3) stored at `.data/db.sqlite` with a Drizzle ORM layer. The previous Coolify deployment attempt was reverted due to issues that are now being re-addressed with a cleaner approach: Nixpacks build strategy + PostgreSQL as a Coolify-managed resource.

The database layer is well-encapsulated — only three files directly reference SQLite:
- `src/db/schema.ts` — table definitions using `sqliteTable`, `integer`, `real`
- `src/db/index.ts` — connection using `better-sqlite3` driver
- `src/db/migrate.ts` — Drizzle SQLite migrator

The app also uses better-sqlite3 as a dependency which requires native compilation (Python, Make, GCC), complicating Docker/Nixpacks builds. Moving to PostgreSQL eliminates this native dependency entirely.

## Goals / Non-Goals

**Goals:**
- Deploy Snapense on Coolify using Nixpacks build strategy
- Replace SQLite with PostgreSQL managed by Coolify as a linked resource
- Eliminate the native module build complexity (better-sqlite3 compilation)
- Enable zero-downtime redeployments with persistent database outside the container
- Support data migration from existing SQLite database to PostgreSQL

**Non-Goals:**
- Multi-region or edge deployment (single Coolify instance is sufficient)
- Database replication or high-availability setup
- Supporting SQLite as a fallback or dual-database mode
- Modifying any application features or business logic

## Decisions

### 1. Use Nixpacks instead of custom Dockerfile

**Decision**: Use `nixpacks.toml` configuration instead of a custom multi-stage Dockerfile.

**Rationale**: Nixpacks is Coolify's native build strategy. It auto-detects Next.js, handles the build pipeline, and produces a working container. Removing SQLite/better-sqlite3 eliminates the native module compilation problem that made Nixpacks tricky before. The remaining native dependency is `sharp`, which Nixpacks handles automatically for Next.js projects.

**Alternative considered**: Keep the custom Dockerfile. Rejected because Nixpacks reduces maintenance burden and aligns with Coolify conventions.

### 2. Use node-postgres (pg) as the PostgreSQL driver

**Decision**: Use the `pg` package with `drizzle-orm/node-postgres` driver.

**Rationale**: `pg` is the most mature and widely-used PostgreSQL client for Node.js. Drizzle has first-class support for it. Connection pooling via `pg.Pool` is built-in. This is the standard Drizzle + PostgreSQL pairing.

**Alternative considered**: `postgres` (postgres.js) — newer, slightly faster, but less ecosystem adoption. Chose `pg` for stability.

### 3. Drizzle schema migration strategy — rewrite, not transform

**Decision**: Rewrite the schema file from SQLite types to PostgreSQL types directly, rather than creating an abstraction layer.

**Rationale**: The schema is small (7 tables, ~150 lines). Maintaining two dialects adds complexity for no benefit since we're fully migrating away from SQLite. A clean rewrite is easier to review and maintain.

**Key type mappings**:
| SQLite (drizzle-orm/sqlite-core) | PostgreSQL (drizzle-orm/pg-core) |
|---|---|
| `sqliteTable` | `pgTable` |
| `integer("col", { mode: "timestamp" })` | `timestamp("col")` |
| `integer("col", { mode: "timestamp_ms" })` | `timestamp("col", { withTimezone: true })` |
| `real("col")` | `numeric("col")` or `doublePrecision("col")` |
| `text("id").primaryKey()` | `text("id").primaryKey()` (stays text, Drizzle generates UUIDs in app code) |
| `sql\`(unixepoch())\`` | `defaultNow()` |
| `sql\`(cast(unixepoch('subsecond') * 1000 as integer))\`` | `defaultNow()` with `timestamp` mode |

### 4. Database connection via DATABASE_URL environment variable

**Decision**: Use `DATABASE_URL` environment variable for PostgreSQL connection, with Coolify auto-injecting it when linking a PostgreSQL resource.

**Rationale**: This is the standard convention. Coolify automatically sets `DATABASE_URL` when you link a PostgreSQL resource to an application. No hardcoded paths, no manual configuration.

### 5. Data migration via custom script

**Decision**: Create a one-time migration script (`scripts/migrate-sqlite-to-pg.ts`) that reads from the existing SQLite file and writes to the new PostgreSQL database.

**Rationale**: pgloader can do this automatically, but a purpose-built script gives us control over type conversions (especially timestamps stored as integers), can validate data integrity, and can be run incrementally. The dataset is small (personal finance app), so a simple script is sufficient.

### 6. Remove Docker deployment artifacts

**Decision**: Remove `Dockerfile`, `docker-compose.yaml`, `deploy.sh`, `update.sh`, `DEPLOYMENT.md`, and `CI_CD_SETUP.md` since Coolify handles all infrastructure.

**Rationale**: These files are specific to the self-managed Docker + Nginx deployment. Keeping them creates confusion about which deployment method is active. Coolify manages its own build, deployment, SSL, and reverse proxy.

### 7. Drizzle Kit configuration for PostgreSQL

**Decision**: Update `drizzle.config.ts` to use `dialect: "postgresql"` and `dbCredentials: { url: process.env.DATABASE_URL }`.

**Rationale**: Straightforward config change. Drizzle Kit will generate new PostgreSQL-specific migrations in the `drizzle/` directory. The old SQLite migration files will be replaced.

## Risks / Trade-offs

- **[Data loss during migration]** → The migration script will run in a transaction-safe manner with validation checks. We'll also keep the original `.data/db.sqlite` file until the migration is confirmed successful.
- **[Downtime during first deploy]** → The initial Coolify deploy + PostgreSQL setup will require manual coordination. After that, Coolify handles zero-downtime redeployments.
- **[Timestamp conversion errors]** → SQLite stores timestamps as integers (unix epoch), while PostgreSQL uses native `timestamp` types. The migration script must handle timezone-aware conversions carefully. We'll use UTC consistently.
- **[Connection pooling in serverless context]** → Next.js serverless functions in standalone mode open/close database connections per invocation. Using `pg.Pool` with appropriate `max` and `idle` settings prevents connection exhaustion. Coolify's PostgreSQL resource has default connection limits that should be monitored.
- **[Removing better-sqlite3 simplifies Nixpacks build]** → This is actually a benefit, not a risk. The `postinstall: npm rebuild better-sqlite3` step in `package.json` was the main build complexity. Without it, Nixpacks can build cleanly without Python/Make/GCC.

## Migration Plan

1. **Pre-migration**: Set up Coolify with PostgreSQL resource, get `DATABASE_URL`
2. **Code changes**: Update all database files and `nixpacks.toml`, remove old deployment files
3. **Schema migration**: Run `drizzle-kit generate` to create new PostgreSQL migrations, then `drizzle-kit push` to create tables in the new database
4. **Data migration**: Run the custom migration script to copy data from `.data/db.sqlite` to PostgreSQL
5. **Deploy**: Push to Coolify, verify the app starts and connects to PostgreSQL
6. **Cleanup**: Remove SQLite migration files from `drizzle/` directory, remove `.data/db.sqlite` from `.gitignore` considerations
7. **Rollback**: If migration fails, revert to the Dockerfile-based deployment (keep a git tag of the pre-migration state)

## Open Questions

- Should we keep the `drizzle/` migration directory versioned, or regenerate fresh for PostgreSQL? (Leaning toward: regenerate fresh, since all migrations will be new SQL)
- What happens to the `.data/` directory? It was used for SQLite storage. After migration, it's no longer needed, but we should confirm nothing else writes there.
- Do we need to update `next.config.js` `output: 'standalone'`? (Likely no — Nixpacks supports standalone output, and it's already configured)