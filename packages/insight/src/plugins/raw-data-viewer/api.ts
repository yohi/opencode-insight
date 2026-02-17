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

const FORBIDDEN_KEYWORD_REGEXES = FORBIDDEN_KEYWORDS.map(
  (keyword) => new RegExp(`\\b${keyword}\\b`, "i"),
);

type SqlRequestBody = {
  query?: string;
};

function hasForbiddenKeyword(query: string): boolean {
  return FORBIDDEN_KEYWORD_REGEXES.some((rx) => rx.test(query));
}

function isTablesPath(pathname: string): boolean {
  return pathname.endsWith("/api/raw-data/tables") || pathname.endsWith("/api/raw-data");
}

function isQueryPath(pathname: string): boolean {
  return pathname.endsWith("/api/raw-data/query") || pathname.endsWith("/api/sql");
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
    throw new Error("Write operations are not allowed.");
  }

  const limitMatches = [...trimmed.matchAll(/\blimit\s+(\d+)\b/gi)];
  if (limitMatches.length === 0) {
    return `${trimmed} LIMIT 100`;
  }

  const lastMatch = limitMatches[limitMatches.length - 1]!;
  const limit = parseInt(lastMatch[1]!, 10);
  if (!Number.isFinite(limit)) {
    throw new Error("Invalid LIMIT value.");
  }

  if (limit <= 100) {
    return trimmed;
  }

  const index = lastMatch.index!;
  const before = trimmed.slice(0, index);
  const after = trimmed.slice(index + lastMatch[0].length);
  return `${before}LIMIT 100${after}`;
}

export async function getRawData(ctx: APIContext): Promise<Response> {
  if (ctx.request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(ctx.request.url);
    if (!isTablesPath(url.pathname)) {
      return json({ error: "Not Found" }, { status: 404 });
    }

    const tables = readonlyQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ) as Array<{ name: string }>;

    return json(tables);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tables.";
    return json({ error: message }, { status: 500 });
  }
}

export async function runSql(ctx: APIContext): Promise<Response> {
  if (ctx.request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(ctx.request.url);
    if (!isQueryPath(url.pathname)) {
      return json({ error: "Not Found" }, { status: 404 });
    }

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
