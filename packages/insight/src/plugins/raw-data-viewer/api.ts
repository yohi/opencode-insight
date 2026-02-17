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

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

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
    throw new ValidationError("Only SELECT queries are allowed.");
  }

  if (cleaned.includes(";")) {
    throw new ValidationError("Multiple statements are not allowed.");
  }

  if (hasForbiddenKeyword(cleaned)) {
    throw new ValidationError("Write operations are not allowed.");
  }

  const limitMatches = [
    ...cleaned.matchAll(/\blimit\s+(?:(\d+)\s*,\s*(\d+)|(\d+)(?:\s+offset\s+(\d+))?)\b/gi),
  ];
  if (limitMatches.length === 0) {
    return `${cleaned} LIMIT 100`;
  }

  const lastMatch = limitMatches[limitMatches.length - 1]!;
  const offsetComma = lastMatch[1];
  const limitComma = lastMatch[2];
  const limitSimpleOrOffset = lastMatch[3];
  const offsetKeyword = lastMatch[4];

  const limitRaw = limitComma ?? limitSimpleOrOffset;
  const limit = Number.parseInt(limitRaw ?? "", 10);
  if (!Number.isFinite(limit)) {
    throw new ValidationError("Invalid LIMIT value.");
  }

  if (limit <= 100) {
    return cleaned;
  }

  const clampedLimit = 100;
  let replacement = `LIMIT ${clampedLimit}`;
  if (offsetComma !== undefined && limitComma !== undefined) {
    replacement = `LIMIT ${offsetComma}, ${clampedLimit}`;
  } else if (offsetKeyword !== undefined && limitSimpleOrOffset !== undefined) {
    replacement = `LIMIT ${clampedLimit} OFFSET ${offsetKeyword}`;
  }

  const index = lastMatch.index!;
  const before = cleaned.slice(0, index);
  const after = cleaned.slice(index + lastMatch[0].length);
  return `${before}${replacement}${after}`;
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
      throw new ValidationError("Query is required.");
    }

    const readonlySql = normalizeReadonlyQuery(query);
    const rows = readonlyQuery(readonlySql);
    return json({ rows });
  } catch (error) {
    const isValidationError = error instanceof ValidationError;
    const message = error instanceof Error ? error.message : "Failed to execute query.";
    return json({ error: message }, { status: isValidationError ? 400 : 500 });
  }
}
