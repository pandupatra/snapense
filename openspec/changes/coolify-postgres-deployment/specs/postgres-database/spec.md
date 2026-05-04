## ADDED Requirements

### Requirement: PostgreSQL connection via environment variable
The database connection SHALL use the `DATABASE_URL` environment variable to connect to PostgreSQL. The connection SHALL use the `pg` package with a connection pool (`pg.Pool`) for efficient connection management.

#### Scenario: Application connects to PostgreSQL
- **WHEN** the application starts and initializes the database connection
- **THEN** it SHALL read `DATABASE_URL` from environment variables
- **THEN** it SHALL create a `pg.Pool` instance with the connection string
- **THEN** it SHALL pass the pool to Drizzle ORM using the `drizzle-orm/node-postgres` driver

#### Scenario: DATABASE_URL is not set
- **WHEN** the `DATABASE_URL` environment variable is not set
- **THEN** the application SHALL log an error message and fail to start

### Requirement: PostgreSQL schema definition
The `src/db/schema.ts` file SHALL define all database tables using PostgreSQL column types from `drizzle-orm/pg-core`. All tables currently defined with `sqliteTable` SHALL be rewritten using `pgTable`. SQLite-specific type mappings SHALL be converted as follows:

- `sqliteTable` → `pgTable`
- `integer("col", { mode: "timestamp" })` → `timestamp("col")`
- `integer("col", { mode: "timestamp_ms" })` → `timestamp("col", { withTimezone: true })`
- `real("col")` → `numeric("col")`
- `sql\`(unixepoch())\`` → `defaultNow()`
- `sql\`(cast(unixepoch('subsecond') * 1000 as integer))\`` → `defaultNow()`
- Text primary keys SHALL remain as `text("id").primaryKey()` with ID generation handled in application code

#### Scenario: Schema uses PostgreSQL-compatible column types
- **WHEN** the application defines database tables in `src/db/schema.ts`
- **THEN** all tables SHALL use `pgTable` from `drizzle-orm/pg-core`
- **THEN** all column types SHALL be PostgreSQL-native (`text`, `integer`, `numeric`, `timestamp`, `boolean`)
- **THEN** no SQLite-specific SQL expressions (`unixepoch`, `subsecond`) SHALL be present

### Requirement: Database migration runner
The `src/db/migrate.ts` file SHALL use the PostgreSQL migrator from `drizzle-orm/node-postgres/migrator`. The migration runner SHALL create a connection using `DATABASE_URL`, run pending migrations from the `drizzle/` directory, and exit.

#### Scenario: Running database migrations
- **WHEN** `npm run db:migrate` is executed
- **THEN** the script SHALL connect to PostgreSQL using `DATABASE_URL`
- **THEN** it SHALL apply all pending migrations from the `drizzle/` directory
- **THEN** it SHALL exit with code 0 on success and code 1 on failure

### Requirement: Drizzle Kit configuration for PostgreSQL
The `drizzle.config.ts` file SHALL be configured for PostgreSQL dialect with `DATABASE_URL` as the connection string.

#### Scenario: Generating migrations with Drizzle Kit
- **WHEN** `drizzle-kit generate` is executed
- **THEN** Drizzle Kit SHALL use the PostgreSQL dialect
- **THEN** it SHALL read the schema from `./src/db/schema.ts`
- **THEN** it SHALL output migration SQL files to `./drizzle/`

#### Scenario: Pushing schema to database
- **WHEN** `drizzle-kit push` is executed
- **THEN** Drizzle Kit SHALL connect to the PostgreSQL database specified by `DATABASE_URL`
- **THEN** it SHALL create or update tables to match the schema

### Requirement: Package dependency changes
The `package.json` SHALL have `better-sqlite3` and `@types/better-sqlite3` removed from dependencies and devDependencies respectively. The `package.json` SHALL have `pg` added to dependencies and `@types/pg` added to devDependencies. The `postinstall` script SHALL be removed.

#### Scenario: Installing production dependencies
- **WHEN** `npm install` or `npm ci` is run
- **THEN** `pg` SHALL be installed as a production dependency
- **THEN** `better-sqlite3` SHALL NOT be installed

### Requirement: One-time data migration from SQLite to PostgreSQL
A migration script (`scripts/migrate-sqlite-to-pg.ts`) SHALL be provided to transfer existing data from the SQLite database (`.data/db.sqlite`) to the new PostgreSQL database. The script SHALL read all rows from all tables in SQLite and insert them into the corresponding PostgreSQL tables, handling timestamp conversions from integer epoch to native PostgreSQL timestamps.

#### Scenario: Migrating existing data
- **WHEN** `npx tsx scripts/migrate-sqlite-to-pg.ts` is executed with `DATABASE_URL` set and `.data/db.sqlite` present
- **THEN** the script SHALL read all data from the SQLite tables (user, session, account, verification, bill, item, income)
- **THEN** it SHALL convert integer epoch timestamps to JavaScript Date objects for PostgreSQL `timestamp` columns
- **THEN** it SHALL insert all records into the corresponding PostgreSQL tables
- **THEN** it SHALL report the number of rows migrated per table

#### Scenario: SQLite file not found
- **WHEN** the `.data/db.sqlite` file does not exist
- **THEN** the script SHALL log a warning and exit without error (first-time deployment with no existing data)

### Requirement: Environment variable removal
The database path configuration (currently `.data/db.sqlite`) SHALL be removed from the codebase. The `DATABASE_URL` environment variable SHALL be the sole database connection configuration.

#### Scenario: Application does not reference SQLite file paths
- **WHEN** the application starts
- **THEN** no code SHALL reference `.data/db.sqlite` or SQLite file paths
- **THEN** the application SHALL NOT create a `.data/` directory