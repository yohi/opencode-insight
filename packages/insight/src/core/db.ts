import { createRequire } from "module";
import * as schema from "./schema";

const require = createRequire(import.meta.url);
const dbPath = process.env.DB_PATH || "opencode.db";

let sqlite: any;
let db: any;
let readonlyDb: any;
let readonlySqlite: any;
let isBun = false;

try {
  // Try loading bun:sqlite (only works in Bun runtime)
  const { Database } = require("bun:sqlite");
  const { drizzle } = require("drizzle-orm/bun-sqlite");

  sqlite = new Database(dbPath);
  sqlite.run("PRAGMA journal_mode = WAL;");
  
  readonlySqlite = new Database(dbPath, { readonly: true });
  
  db = drizzle(sqlite, { schema });
  readonlyDb = drizzle(readonlySqlite, { schema });
  isBun = true;
  console.log("Using bun:sqlite");
} catch (e) {
  console.error("Failed to load bun:sqlite:", e);
  // Fallback to better-sqlite3 (works in Node/Vite)
  console.log("bun:sqlite not found, falling back to better-sqlite3");
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");

  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  
  readonlySqlite = new Database(dbPath, { readonly: true });

  db = drizzle(sqlite, { schema });
  readonlyDb = drizzle(readonlySqlite, { schema });
  isBun = false;
}

// Helper for raw queries to abstract differences
export function rawQuery(sql: string, params: any[] = []) {
  if (isBun) {
    return sqlite.query(sql).all(...params);
  } else {
    return sqlite.prepare(sql).all(...params);
  }
}

export function readonlyQuery(sql: string, params: any[] = []) {
  if (isBun) {
    return readonlySqlite.query(sql).all(...params);
  } else {
    return readonlySqlite.prepare(sql).all(...params);
  }
}

export { sqlite, db, readonlySqlite, readonlyDb };
