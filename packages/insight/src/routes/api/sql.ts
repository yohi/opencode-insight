import { APIEvent, json } from "solid-start/api";
import { readonlyQuery } from "~/core/db";

const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "attach",
  "detach",
  "pragma",
  "replace",
  "vacuum",
  "reindex",
  "truncate",
];

type SqlRequestBody = {
  query?: string;
};

function hasForbiddenKeyword(query: string): boolean {
  const lowered = query.toLowerCase();
  return FORBIDDEN_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`, "i").test(lowered));
}

function normalizeReadonlyQuery(query: string): string {
  const trimmed = query.trim();

  if (!/^select\b/i.test(trimmed)) {
    throw new Error("Only SELECT queries are allowed.");
  }

  if (trimmed.includes(";")) {
    throw new Error("Multiple statements are not allowed.");
  }

  if (hasForbiddenKeyword(trimmed)) {
    throw new Error("Forbidden SQL keyword detected.");
  }

  const limitMatch = trimmed.match(/\blimit\s+(\d+)\b/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) {
      return trimmed.replace(/\blimit\s+\d+\b/i, `LIMIT ${MAX_LIMIT}`);
    }
    return trimmed;
  }

  return `SELECT * FROM (${trimmed}) AS __query LIMIT 100`;
}

export async function POST({ request }: APIEvent) {
  try {
    const body = (await request.json()) as SqlRequestBody;
    const query = body.query?.trim() ?? "";

    if (!query) {
      return json({ error: "Query is required." }, { status: 400 });
    }

    const readonlySql = normalizeReadonlyQuery(query);
    const rows = readonlyQuery(readonlySql);
    return json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute query.";
    return json({ error: message }, { status: 400 });
  }
}
