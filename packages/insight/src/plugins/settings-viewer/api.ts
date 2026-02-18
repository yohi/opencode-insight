import { json } from "solid-start/api";
import fs from "node:fs/promises";

import type { APIContext } from "~/core/plugin";
import { expandHome, CONFIG_SEARCH_PATHS } from "~/core/path-utils";

export async function getSettings(_ctx: APIContext): Promise<Response> {
  const searchPaths = CONFIG_SEARCH_PATHS;

  for (const rawPath of searchPaths) {
    if (!rawPath) continue;
    const configPath = expandHome(rawPath);

    try {
      const content = await fs.readFile(configPath, "utf-8");
      console.log(`[SettingsViewer] Found config at: ${configPath}`);
      return json({
        content,
        path: configPath,
        found: true,
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "ENOENT") {
        console.error(`[SettingsViewer] Error reading config at ${configPath}:`, err);
      }
      // If ENOENT (file not found), continue to next path
    }
  }

  console.log("[SettingsViewer] No opencode.jsonc found in search paths");
  return json({
    content: "",
    path: null,
    found: false,
  });
}
