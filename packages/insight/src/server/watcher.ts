import fs from "node:fs";
import path from "node:path";
import { db } from "../core/db";
import { message, session, usage } from "../core/schema";
import { broadcastToTopic, getSubscriptionSnapshot } from "./ws";
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
  return db.select().from(session).orderBy(desc(session.updatedAt)).limit(20);
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
  const snapshot = getSubscriptionSnapshot();
  if (!snapshot.hasSessionListSubscribers && snapshot.sessionDetailIds.length === 0) {
    return;
  }

  if (snapshot.hasSessionListSubscribers) {
    const sessions = await fetchSessionList();
    broadcastToTopic("sessions:list", {
      type: "UPDATE_SESSION_LIST",
      sessions,
    });
  }

  for (const sessionId of snapshot.sessionDetailIds) {
    const detail = await fetchSessionDetail(sessionId);
    if (!detail) {
      continue;
    }

    broadcastToTopic(`sessions:detail:${sessionId}`, {
      type: "UPDATE_SESSION_DETAIL",
      sessionId,
      session: detail,
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
