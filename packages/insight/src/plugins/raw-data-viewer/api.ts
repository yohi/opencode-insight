import { json } from "solid-start/api";
import { readonlyQuery } from "~/core/db";
import type { APIContext } from "~/core/plugin";

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

  const limitMatches = [...trimmed.matchAll(/\blimit\s+(\d+)\b/gi)];
  if (limitMatches.length > 0) {
    const lastMatch = limitMatches[limitMatches.length - 1]!;
    const limit = parseInt(lastMatch[1]!, 10);
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) {
      const index = lastMatch.index!;
      const before = trimmed.slice(0, index);
      const after = trimmed.slice(index + lastMatch[0].length);
      return `${before}LIMIT ${MAX_LIMIT}${after}`;
    }
    return trimmed;
  }

  return `SELECT * FROM (${trimmed}) AS __query LIMIT 100`;
}

export async function getRawData(ctx: APIContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const table = url.searchParams.get("table");

  const tables = readonlyQuery(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  ) as Array<{ name: string }>;
  const tableNames = tables.map((t) => t.name);

  if (!table) {
    return json(tables);
  }

  if (!tableNames.includes(table)) {
    return json({ error: "Invalid table name" }, { status: 400 });
  }

  try {
    const safeName = table.replace(/"/g, '""');
    const rows = readonlyQuery(`SELECT * FROM "${safeName}" LIMIT 100`);
    return json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to query table.";
    return json({ error: message }, { status: 400 });
  }
}

export async function runSql(ctx: APIContext): Promise<Response> {
  try {
    const body = (await ctx.request.json()) as SqlRequestBody;
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
