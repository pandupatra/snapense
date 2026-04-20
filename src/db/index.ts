import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let _db: ReturnType<typeof drizzle> | null = null;

function createDb() {
  const dbPath = ".data/db.sqlite";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
