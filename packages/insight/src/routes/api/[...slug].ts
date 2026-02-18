import { APIEvent, json } from "solid-start/api";
import { loadPlugins } from "~/core/plugin-loader.server";
import type { APIContext } from "~/core/plugin";

type MatchResult = {
  handler: (ctx: APIContext) => Promise<Response>;
  params: Record<string, string>;
};

function normalizePath(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function splitPath(value: string): string[] {
  const normalized = normalizePath(value);
  return normalized ? normalized.split("/").filter(Boolean) : [];
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]!;
    const v = pathParts[i]!;

    if (p.startsWith(":")) {
      const key = p.slice(1);
      if (!key) {
        return null;
      }
      params[key] = v;
      continue;
    }
    if (p !== v) {
      return null;
    }
  }

  return params;
}

async function resolveHandler(slug: string): Promise<MatchResult | null> {
  const path = normalizePath(slug);
  if (!path) {
    return null;
  }

  const plugins = await loadPlugins();

  // First pass: exact match.
  for (const plugin of plugins) {
    if (!plugin.api) {
      continue;
    }
    const handler = plugin.api[path];
    if (handler) {
      return { handler, params: {} };
    }
  }

  // Second pass: pattern match (e.g., "sessions/:id").
  let bestMatch: MatchResult | null = null;
  let bestMatchPluginName: string | null = null;

  for (const plugin of plugins) {
    if (!plugin.api) {
      continue;
    }
    for (const [pattern, handler] of Object.entries(plugin.api)) {
      const params = matchPattern(pattern, path);
      if (params) {
        // Ensure handler is a function (runtime check) and narrow type
        if (typeof handler !== "function") {
          console.warn(`[API] Invalid handler for pattern "${pattern}" in plugin "${plugin.name}"`);
          continue;
        }

        if (bestMatch) {
          console.warn(
            `[API] Collision detected for path "${path}". Pattern "${pattern}" (plugin: ${plugin.name}) matches, but another handler was already found (plugin: ${bestMatchPluginName}). Keeping the first match.`
          );
        } else {
          bestMatch = { handler: handler as (ctx: APIContext) => Promise<Response>, params };
          bestMatchPluginName = plugin.name;
        }
      }
    }
  }

  return bestMatch;
}

async function dispatch(event: APIEvent): Promise<Response> {
  const slug = event.params.slug ?? "";
  const resolved = await resolveHandler(slug);
  if (!resolved) {
    return json({ error: "Not Found" }, { status: 404 });
  }

  try {
    return await resolved.handler({
      request: event.request,
      params: resolved.params,
    });
  } catch (error) {
    console.error("Plugin API error:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(event: APIEvent) {
  return dispatch(event);
}

export async function POST(event: APIEvent) {
  return dispatch(event);
}

export async function PUT(event: APIEvent) {
  return dispatch(event);
}

export async function PATCH(event: APIEvent) {
  return dispatch(event);
}

export async function DELETE(event: APIEvent) {
  return dispatch(event);
}

export async function OPTIONS(event: APIEvent) {
  // CORS Preflight - let the handler manage it or dispatch normally if implemented
  // Note: dispatch() receives all methods. Plugin handlers must inspect event.request.method
  return dispatch(event);
}
