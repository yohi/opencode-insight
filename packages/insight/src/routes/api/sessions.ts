import { APIEvent, json } from "solid-start/api";
import { db } from "~/core/db";
import { session } from "~/core/schema";
import { desc } from "drizzle-orm";

export async function GET({ request }: APIEvent) {
  const sessions = await db.select().from(session).orderBy(desc(session.updatedAt));
  return json(sessions);
}
