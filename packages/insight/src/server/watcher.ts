import fs from "node:fs";
import path from "node:path";
import { readonlyDb as db } from "../core/db";
import { message, session, usage } from "../core/schema";
import { broadcast, hasSubscribers } from "./ws";
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
const MAX_RECENT_MESSAGES = 50;

// Cache to track session state and avoid broadcasting unchanged sessions
const sessionStateCache = new Map<
  string,
  { lastMessageCount: number; lastMessageId: number; lastUsageTimestamp: number; lastUpdated: number }
>();

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
  const sessions = await fetchSessionList();
  const sessionIds = sessions.map((s) => s.id);

  // Clean up stale cache keys
  const activeSessionIds = new Set(sessionIds);
  for (const cachedId of sessionStateCache.keys()) {
    if (!activeSessionIds.has(cachedId)) {
      sessionStateCache.delete(cachedId);
    }
  }

  for (const s of sessions) {
    const topic = `session:${s.id}`;
    if (!hasSubscribers(topic)) {
      continue;
    }

    const details = await fetchSessionDetails([s.id]);
    const detail = details[0];

    if (!detail) {
      continue;
    }

    const currentMessageCount = detail.messages.length;
    const lastMessage = detail.messages[currentMessageCount - 1];
    const currentLastMessageId = lastMessage?.id ?? 0;
    const currentLastUsageTimestamp = detail.usage?.timestamp?.getTime() ?? 0;
    const currentLastUpdated = s.updatedAt?.getTime() ?? 0;

    const cachedState = sessionStateCache.get(s.id);

    // Skip if no changes detected
    if (
      cachedState &&
      cachedState.lastMessageCount === currentMessageCount &&
      cachedState.lastMessageId === currentLastMessageId &&
      cachedState.lastUsageTimestamp === currentLastUsageTimestamp &&
      cachedState.lastUpdated === currentLastUpdated
    ) {
      continue;
    }

    // Update cache
    sessionStateCache.set(s.id, {
      lastMessageCount: currentMessageCount,
      lastMessageId: currentLastMessageId,
      lastUsageTimestamp: currentLastUsageTimestamp,
      lastUpdated: currentLastUpdated,
    });

    // Send only recent slice to reduce payload size
    const recentMessages = detail.messages.slice(-MAX_RECENT_MESSAGES);

    broadcast(
      {
        type: "UPDATE_SESSION",
        sessionId: s.id,
        data: recentMessages,
        usage: detail.usage,
      },
      (topics) => {
        return topics.has(topic);
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
