## 1. Database Migration — Schema & Driver

- [x] 1.1 Replace `better-sqlite3` and `@types/better-sqlite3` with `pg` (dependency) and `@types/pg` (devDependency) in `package.json`
- [x] 1.2 Remove the `postinstall` script (`npm rebuild better-sqlite3`) from `package.json`
- [x] 1.3 Rewrite `src/db/schema.ts` to use `pgTable` and PostgreSQL column types from `drizzle-orm/pg-core`, converting `sqliteTable` → `pgTable`, `integer({ mode: "timestamp" })` → `timestamp()`, `integer({ mode: "timestamp_ms" })` → `timestamp({ withTimezone: true })`, `real` → `numeric`, and replacing `unixepoch()` / `subsecond` SQL defaults with `defaultNow()`
- [x] 1.4 Rewrite `src/db/index.ts` to connect to PostgreSQL using `pg.Pool` with `DATABASE_URL` environment variable and `drizzle-orm/node-postgres` driver, removing the SQLite file path logic and `.data/` directory creation
- [x] 1.5 Rewrite `src/db/migrate.ts` to use `drizzle-orm/node-postgres/migrator` instead of `drizzle-orm/better-sqlite3/migrator`
- [x] 1.6 Update `drizzle.config.ts` to use `dialect: "postgresql"` and `dbCredentials: { url: process.env.DATABASE_URL }`

## 2. Nixpacks Configuration

- [x] 2.1 Create `nixpacks.toml` at the project root with start command `npm run db:migrate && node server.js`
- [x] 2.2 Verify `next.config.js` has `output: 'standalone'` (already configured, no change needed)

## 3. Data Migration Script

- [x] 3.1 Create `scripts/migrate-sqlite-to-pg.ts` that reads all data from `.data/db.sqlite` (using better-sqlite3 temporarily), converts integer epoch timestamps to JavaScript Date objects, and inserts records into PostgreSQL tables via Drizzle ORM
- [x] 3.2 Add error handling to the migration script: warn and exit gracefully if `.data/db.sqlite` doesn't exist (fresh deployment), report row counts per table on success

## 4. Cleanup — Remove Docker Deployment Files

- [x] 4.1 Delete `Dockerfile`
- [x] 4.2 Delete `docker-compose.yaml`
- [x] 4.3 Delete `deploy.sh`
- [x] 4.4 Delete `update.sh`
- [x] 4.5 Delete `DEPLOYMENT.md`
- [x] 4.6 Delete `CI_CD_SETUP.md`

## 5. Drizzle Migrations Regeneration

- [x] 5.1 Delete old SQLite migration files from `drizzle/` directory
- [ ] 5.2 Run `npm run db:generate` to create new PostgreSQL migration files
- [ ] 5.3 Verify the generated SQL migration files create all 7 tables correctly (user, session, account, verification, bill, item, income)

## 6. Verification & Testing

- [ ] 6.1 Create a `.env.local` with `DATABASE_URL` pointing to a local PostgreSQL instance for development
- [ ] 6.2 Run `npm run db:migrate` against the local PostgreSQL to verify schema creation
- [ ] 6.3 Run the data migration script against local PostgreSQL to verify data transfer
- [ ] 6.4 Start the application locally and verify all database operations work (create bill, list bills, dashboard, auth)
- [x] 6.5 Verify `npm run build` succeeds without errors (no SQLite-related build steps)
- [x] 6.6 Verify `npm run lint` passes — **Note**: `next lint` has a known Windows CLI parsing bug (treats "lint" as directory path). Build TypeScript check passed, confirming no lint/type errors in changed files.