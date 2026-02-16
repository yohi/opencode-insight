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

async function fetchSessionList() {
  return db.select().from(session).orderBy(desc(session.updatedAt)).limit(10);
}

async function fetchSessionDetail(sessionId: string): Promise<SessionWithDetails | null> {
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
  };
}

async function dispatchSubscriptionUpdates() {
  // Spec-aligned: broadcast per-session message updates.
  // We don't currently track per-session subscriptions; clients can ignore updates they don't care about.
  const sessions = await fetchSessionList();
  for (const s of sessions) {
    const detail = await fetchSessionDetail(s.id);
    if (!detail) {
      continue;
    }

    broadcast({
      type: "UPDATE_SESSION",
      sessionId: s.id,
      data: detail.messages,
    });
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
