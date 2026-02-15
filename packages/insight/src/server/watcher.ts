import fs from "node:fs";
import path from "node:path";
import { db } from "../core/db";
import { session, message } from "../core/schema";
import { broadcast } from "./ws";
import { desc, eq } from "drizzle-orm";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 200;

export function startWatcher(dbPath: string) {
  const dbDir = path.dirname(dbPath);
  const dbName = path.basename(dbPath);

  console.log(`Watching database directory at ${dbDir} for changes to ${dbName}`);

  if (!fs.existsSync(dbDir)) {
    console.warn(`Database directory not found: ${dbDir}`);
    return;
  }

  fs.watch(dbDir, (eventType, filename) => {
    // Check if the change is related to the database file (or its WAL/SHM files)
    if (filename && (filename.startsWith(dbName))) {
      // Debounce logic
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        try {
          console.log(`Database changed (${filename}), fetching updates...`);
          // Fetch latest sessions (example query)
          const sessions = await db.select().from(session).orderBy(desc(session.updatedAt)).limit(10);

          // Broadcast update
          broadcast({
            type: "UPDATE_SESSION",
            sessionId: "all", // Or specific ID logic
            data: sessions
          });
        } catch (error) {
          console.error("Error fetching updates:", error);
        }
      }, DEBOUNCE_MS);
    }
  });
}
