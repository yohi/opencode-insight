import { APIEvent, json } from "solid-start/api";
import { db } from "~/core/db";
import { session } from "~/core/schema";
import { desc } from "drizzle-orm";

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);
  const parsedLimit = parseInt(url.searchParams.get("limit") || "20");
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 1), 100);
  
  const parsedOffset = parseInt(url.searchParams.get("offset") || "0");
  const offset = Math.max(Number.isNaN(parsedOffset) ? 0 : parsedOffset, 0);

  const sessions = await db
    .select()
    .from(session)
    .orderBy(desc(session.updatedAt))
    .limit(limit)
    .offset(offset);
  return json(sessions);
}
