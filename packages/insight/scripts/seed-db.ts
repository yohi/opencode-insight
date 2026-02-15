import { Database } from "bun:sqlite";

const db = new Database("opencode.db");

console.log("Seeding database...");

// Enable WAL
db.run("PRAGMA journal_mode = WAL;");

// Drop existing tables
db.run("DROP TABLE IF EXISTS usage;");
db.run("DROP TABLE IF EXISTS message;");
db.run("DROP TABLE IF EXISTS session;");

// Create tables
db.run(`
  CREATE TABLE session (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    status TEXT
  );
`);

db.run(`
  CREATE TABLE message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT,
    content TEXT,
    timestamp INTEGER,
    FOREIGN KEY(session_id) REFERENCES session(id)
  );
`);

db.run(`
  CREATE TABLE usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    timestamp INTEGER,
    FOREIGN KEY(session_id) REFERENCES session(id)
  );
`);

// Insert dummy data
const session1 = "sess_001";
const session2 = "sess_002";
const now = Math.floor(Date.now() / 1000);

db.run("INSERT INTO session (id, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)", [session1, "Fix Login Bug", now, now, "active"]);
db.run("INSERT INTO session (id, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)", [session2, "Refactor Auth", now - 3600, now - 1800, "completed"]);

db.run("INSERT INTO message (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", [session1, "user", "I can't login with email", now]);
db.run("INSERT INTO message (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", [session1, "assistant", "Checking the logs...", now + 5]);
db.run("INSERT INTO message (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", [session2, "user", "Refactor the auth middleware", now - 3600]);
db.run("INSERT INTO message (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", [session2, "assistant", "Sure, I'll start by...", now - 3500]);

console.log("Database seeded successfully.");
db.close();
