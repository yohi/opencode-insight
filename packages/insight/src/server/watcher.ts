import fs from "node:fs";
import path from "node:path";
import { readonlyDb as db } from "../core/db";
import { message, session, usage } from "../core/schema";
import { broadcast } from "./ws";
import { asc, desc, eq } from "drizzle-orm";
import type { SessionWithDetails } from "../core/types";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 200;
let isDispatching = false;
let hasPendingChange = false;

function isTargetDbFile(filename: string | null, dbName: string): boolean {
  return Boolean(filename && filename.startsWith(dbName));
}

const DEFAULT_SESSION_LIMIT = 20;

async function fetchSessionList(limit = DEFAULT_SESSION_LIMIT) {
  return db.select().from(session).orderBy(desc(session.updatedAt)).limit(limit);
}

async function fetchSessionDetails(sessionIds: string[]): Promise<(SessionWithDetails | null)[]> {
  if (sessionIds.length === 0) return [];

  const results = await Promise.allSettled(
    sessionIds.map(async (sessionId) => {
      const selectedSession = await db
        .select()
        .from(session)
        .where(eq(session.id, sessionId))
        .limit(1);

      const targetSession = selectedSession[0];
      if (!targetSession) {
        return null;
      }

      const messages = await db
        .select()
        .from(message)
        .where(eq(message.sessionId, sessionId))
        .orderBy(asc(message.timestamp));

      const latestUsageRows = await db
        .select()
        .from(usage)
        .where(eq(usage.sessionId, sessionId))
        .orderBy(desc(usage.timestamp))
        .limit(1);

      return {
        ...targetSession,
        messages,
        usage: latestUsageRows[0],
      } as SessionWithDetails;
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error(
        `Failed to fetch session detail for ${sessionIds[index]}:`,
        result.reason
      );
      return null;
    }
  });
}

async function dispatchSubscriptionUpdates() {
  // Spec-aligned: broadcast per-session message updates.
  // We don't currently track per-session subscriptions; clients can ignore updates they don't care about.
  const sessions = await fetchSessionList();
  const sessionIds = sessions.map((s) => s.id);
  const details = await fetchSessionDetails(sessionIds);

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]!;
    const detail = details[i];

    if (!detail) {
      continue;
    }

    // TODO: Implement selective broadcasting based on client subscriptions.
    // Current implementation broadcasts to ALL clients, which is inefficient.
    // Clients currently have to filter messages themselves.
    broadcast(
      {
        type: "UPDATE_SESSION",
        sessionId: s.id,
        data: detail.messages,
      },
      (topics) => {
        // Basic filtering: send only if client is subscribed to "logs" (general)
        // or if we implement specific session subscription topics in the future.
        // For now, "logs" implies interest in all session updates as per current spec.
        return topics.has("logs");
      }
    );
  }
}

async function flushUpdates() {
  if (isDispatching) {
    hasPendingChange = true;
    return;
  }

  isDispatching = true;
  try {
    do {
      hasPendingChange = false;
      await dispatchSubscriptionUpdates();
    } while (hasPendingChange);
  } catch (error) {
    console.error("Error fetching updates:", error);
  } finally {
    isDispatching = false;
  }
}

function scheduleFlush() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushUpdates();
  }, DEBOUNCE_MS);
}

export function startWatcher(dbPath: string) {
  const dbDir = path.dirname(dbPath);
  const dbName = path.basename(dbPath);

  console.log(`Watching database directory at ${dbDir} for changes to ${dbName}`);

  if (!fs.existsSync(dbDir)) {
    console.warn(`Database directory not found: ${dbDir}`);
    return;
  }

  fs.watch(dbDir, (eventType, filename) => {
    if (!isTargetDbFile(filename, dbName)) {
      return;
    }

    console.log(`Database change detected (${eventType}: ${filename})`);
    scheduleFlush();
  });
}
