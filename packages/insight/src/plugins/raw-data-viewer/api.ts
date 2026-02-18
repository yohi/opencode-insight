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

function containsSqlComment(query: string): boolean {
  return /--|(?:\/\*)/.test(query);
}

function isTablesPath(pathname: string): boolean {
  return pathname.endsWith("/api/raw-data/tables") || pathname.endsWith("/api/raw-data");
}

function isQueryPath(pathname: string): boolean {
  return pathname.endsWith("/api/raw-data/query") || pathname.endsWith("/api/sql");
}

/**
 * Normalizes a query to ensure it is read-only and limited.
 *
 * WARNING: This function does NOT protect against SQL injection via table/column identifiers.
 * It assumes that table/column names have been validated or escaped by the caller.
 * It strictly enforces SELECT-only queries and LIMIT constraints.
 *
 * @param query The raw SQL query string.
 * @returns The normalized safe query string.
 * @throws ValidationError if the query contains forbidden keywords or patterns.
 */
function normalizeReadonlyQuery(query: string): string {


  const cleaned = query.trim();

  if (!/^select\b/i.test(cleaned)) {
    throw new ValidationError("Only SELECT queries are allowed.");
  }

  // Scanner to handle quotes and check for top-level semicolons
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inBracket = false;
  let sanitized = "";
  let topLevelSemicolonCount = 0;
  let lastTopLevelSemicolonIndex = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];


    if (inSingle) {
      if (char === "'") inSingle = false;
      sanitized += " ";
    } else if (inDouble) {
      if (char === '"') inDouble = false;
      sanitized += " ";
    } else if (inBacktick) {
      if (char === "`") inBacktick = false;
      sanitized += " ";
    } else if (inBracket) {
      if (char === "]") inBracket = false;
      sanitized += " ";
    } else {
      if (char === "'") inSingle = true;
      else if (char === '"') inDouble = true;
      else if (char === "`") inBacktick = true;
      else if (char === "[") inBracket = true;
      else if (char === ";") {
        topLevelSemicolonCount++;
        lastTopLevelSemicolonIndex = i;
      }

      sanitized += char;
    }
  }

  if (topLevelSemicolonCount > 1) {
    throw new ValidationError("Multiple statements are not allowed.");
  }
  if (topLevelSemicolonCount === 1) {
    if (cleaned.slice(lastTopLevelSemicolonIndex + 1).trim() !== "") {
      throw new ValidationError("Multiple statements are not allowed.");
    }
  }

  if (containsSqlComment(sanitized)) {
    throw new ValidationError("SQL comments are not allowed.");
  }

  if (hasForbiddenKeyword(sanitized)) {
    throw new ValidationError("Write operations are not allowed.");
  }

  const limitMatches = [
    ...sanitized.matchAll(/\blimit\s+(?:(\d+)\s*,\s*(\d+)|(\d+)(?:\s+offset\s+(\d+))?)\b/gi),
  ];
  if (limitMatches.length === 0) {
    // If "LIMIT" keyword exists but didn't match the strict regex (e.g. negative numbers or syntax error), reject it.
    if (/\blimit\b/i.test(sanitized)) {
      throw new ValidationError("Invalid LIMIT value.");
    }

    const baseQuery =
      topLevelSemicolonCount === 1 ? cleaned.slice(0, lastTopLevelSemicolonIndex) : cleaned;

    return `${baseQuery} LIMIT 100`;
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
