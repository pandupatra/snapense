/**
 * One-time migration script: SQLite → PostgreSQL
 *
 * Prerequisites:
 * - better-sqlite3 must be available (temporarily install if already removed)
 * - DATABASE_URL environment variable must be set (or in .env.local)
 * - PostgreSQL database must exist and be accessible
 *
 * Usage:
 *   npx tsx scripts/migrate-sqlite-to-pg.ts
 */

import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

async function main() {
  const fs = await import("node:fs");
  const sqlitePath = ".data/db.sqlite";

  if (!fs.existsSync(sqlitePath)) {
    console.warn(
      `[migrate] SQLite file not found at ${sqlitePath}. Skipping migration (fresh deployment).`,
    );
    process.exit(0);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[migrate] DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath);
  const pool = new Pool({ connectionString: databaseUrl });
  const pgDb = drizzle(pool, { schema });

  // SQLite integer timestamps:
  // - { mode: "timestamp" }     → seconds since epoch
  // - { mode: "timestamp_ms" }  → milliseconds since epoch
  const toDate = (epoch: number | null) =>
    epoch ? new Date(epoch * 1000) : null;
  const toDateMs = (epoch: number | null) =>
    epoch ? new Date(epoch) : null;

  try {
    // Migrate users (timestamp_ms columns)
    const users = sqlite.prepare("SELECT * FROM user").all() as any[];
    if (users.length > 0) {
      await pgDb.insert(schema.users).values(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: u.email_verified === 1,
          image: u.image,
          createdAt: toDateMs(u.created_at),
          updatedAt: toDateMs(u.updated_at),
        })),
      );
      console.log(`[migrate] Migrated ${users.length} users`);
    }

    // Migrate sessions (timestamp columns)
    const sessions = sqlite.prepare("SELECT * FROM session").all() as any[];
    if (sessions.length > 0) {
      await pgDb.insert(schema.sessions).values(
        sessions.map((s) => ({
          id: s.id,
          userId: s.user_id,
          expiresAt: toDate(s.expires_at),
          token: s.session_token,
          ipAddress: s.ip_address,
          userAgent: s.user_agent,
          createdAt: toDate(s.created_at),
          updatedAt: toDate(s.updated_at),
        })),
      );
      console.log(`[migrate] Migrated ${sessions.length} sessions`);
    }

    // Migrate accounts (timestamp_ms columns)
    const accounts = sqlite.prepare("SELECT * FROM account").all() as any[];
    if (accounts.length > 0) {
      await pgDb.insert(schema.accounts).values(
        accounts.map((a) => ({
          id: a.id,
          accountId: a.account_id,
          providerId: a.provider_id,
          userId: a.user_id,
          accessToken: a.access_token,
          refreshToken: a.refresh_token,
          idToken: a.id_token,
          accessTokenExpiresAt: toDateMs(a.access_token_expires_at),
          refreshTokenExpiresAt: toDateMs(a.refresh_token_expires_at),
          scope: a.scope,
          password: a.password,
          createdAt: toDateMs(a.created_at),
          updatedAt: toDateMs(a.updated_at),
        })),
      );
      console.log(`[migrate] Migrated ${accounts.length} accounts`);
    }

    // Migrate verifications (timestamp columns)
    const verifications = sqlite
      .prepare("SELECT * FROM verification")
      .all() as any[];
    if (verifications.length > 0) {
      await pgDb.insert(schema.verifications).values(
        verifications.map((v) => ({
          id: v.id,
          identifier: v.identifier,
          value: v.value,
          expiresAt: toDate(v.expires_at),
          createdAt: toDate(v.created_at),
          updatedAt: toDate(v.updated_at),
        })),
      );
      console.log(
        `[migrate] Migrated ${verifications.length} verifications`,
      );
    }

    // Migrate bills (timestamp columns)
    const bills = sqlite.prepare("SELECT * FROM bill").all() as any[];
    if (bills.length > 0) {
      await pgDb.insert(schema.bills).values(
        bills.map((b) => ({
          id: b.id,
          userId: b.user_id,
          amount: b.amount,
          currency: b.currency,
          category: b.category,
          description: b.description,
          merchant: b.merchant,
          transactionDate: toDate(b.transaction_date),
          createdAt: toDate(b.created_at),
        })),
      );
      console.log(`[migrate] Migrated ${bills.length} bills`);
    }

    // Migrate items (no timestamps)
    const items = sqlite.prepare("SELECT * FROM item").all() as any[];
    if (items.length > 0) {
      await pgDb.insert(schema.items).values(
        items.map((i) => ({
          id: i.id,
          billId: i.bill_id,
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
      );
      console.log(`[migrate] Migrated ${items.length} items`);
    }

    // Migrate incomes (timestamp columns)
    const incomes = sqlite.prepare("SELECT * FROM income").all() as any[];
    if (incomes.length > 0) {
      await pgDb.insert(schema.incomes).values(
        incomes.map((i) => ({
          id: i.id,
          userId: i.user_id,
          amount: i.amount,
          currency: i.currency,
          category: i.category,
          description: i.description,
          source: i.source,
          receivedAt: toDate(i.received_at),
          createdAt: toDate(i.created_at),
        })),
      );
      console.log(`[migrate] Migrated ${incomes.length} incomes`);
    }

    console.log("[migrate] All migrations completed successfully!");
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
});
