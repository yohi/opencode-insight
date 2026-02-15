import { APIEvent, json } from "solid-start/api";
import { db } from "~/core/db";
import { message, session } from "~/core/schema";
import { desc, eq } from "drizzle-orm";

export async function GET({ params }: APIEvent) {
  const sessionId = params.id;
  const sessionData = await db.select().from(session).where(eq(session.id, sessionId)).limit(1);
  if (!sessionData.length) return json({ error: "Session not found" }, { status: 404 });

  const messages = await db.select().from(message).where(eq(message.sessionId, sessionId)).orderBy(message.timestamp);

  return json({
    ...sessionData[0],
    messages
  });
}
