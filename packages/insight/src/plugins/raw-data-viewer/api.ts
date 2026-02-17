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
  // Remove SQL comments to prevent bypassing LIMIT enforcement
  const cleaned = query
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .trim();

  if (!/^select\b/i.test(cleaned)) {
    throw new Error("Only SELECT queries are allowed.");
  }

  if (cleaned.includes(";")) {
    throw new Error("Multiple statements are not allowed.");
  }

  if (hasForbiddenKeyword(cleaned)) {
    throw new Error("Write operations are not allowed.");
  }

  const limitMatches = [...cleaned.matchAll(/\blimit\s+(\d+)\b/gi)];
  if (limitMatches.length === 0) {
    return `${cleaned} LIMIT 100`;
  }

  const lastMatch = limitMatches[limitMatches.length - 1]!;
  const limit = parseInt(lastMatch[1]!, 10);
  if (!Number.isFinite(limit)) {
    throw new Error("Invalid LIMIT value.");
  }

  if (limit <= 100) {
    return cleaned;
  }

  const index = lastMatch.index!;
  const before = cleaned.slice(0, index);
  const after = cleaned.slice(index + lastMatch[0].length);
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

    return json({ tables });
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
    // Simple heuristic: if message contains "allowed" or "required" or "Invalid", it's likely a validation error (400)
    // Otherwise assume server error (500)
    const isValidationError = 
      message.includes("allowed") || 
      message.includes("required") || 
      message.includes("Invalid");
      
    return json({ error: message }, { status: isValidationError ? 400 : 500 });
  }
}
