import { json } from "solid-start/api";
import { readonlyDb as db } from "~/core/db";
import { message, session } from "~/core/schema";
import { desc, eq } from "drizzle-orm";
import type { APIContext } from "~/core/plugin";

export async function getSessions(ctx: APIContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const parsedLimit = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 1), 100);

  const parsedOffset = parseInt(url.searchParams.get("offset") || "0", 10);
  const offset = Math.max(Number.isNaN(parsedOffset) ? 0 : parsedOffset, 0);

  const sessions = await db
    .select()
    .from(session)
    .orderBy(desc(session.updatedAt))
    .limit(limit)
    .offset(offset);

  return json(sessions);
}

export async function getSessionDetails(ctx: APIContext): Promise<Response> {
  const sessionId = ctx.params.id;
  if (!sessionId) {
    return json({ error: "Session not found" }, { status: 404 });
  }

  const sessionData = await db.select().from(session).where(eq(session.id, sessionId)).limit(1);
  if (!sessionData.length) {
    return json({ error: "Session not found" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.sessionId, sessionId))
    .orderBy(message.timestamp);

  return json({
    ...sessionData[0],
    messages,
  });
}
