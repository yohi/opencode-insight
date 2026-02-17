import { json } from "solid-start/api";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { APIContext } from "~/core/plugin";

/**
 * Resolves ~ to home directory
 */
function expandHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export async function getSettings(_ctx: APIContext): Promise<Response> {
  const searchPaths = [
    process.env.OPENCODE_CONFIG_PATH,
    path.join(process.cwd(), "opencode.jsonc"),
    "~/.config/opencode/opencode.jsonc",
  ];

  for (const rawPath of searchPaths) {
    if (!rawPath) continue;
    const configPath = expandHome(rawPath);

    if (existsSync(configPath)) {
      try {
        const content = await fs.readFile(configPath, "utf-8");
        console.log(`[SettingsViewer] Found config at: ${configPath}`);
        return json({
          content,
          path: configPath,
          found: true,
        });
      } catch (err) {
        console.error(`[SettingsViewer] Error reading config at ${configPath}:`, err);
      }
    }
  }

  console.log("[SettingsViewer] No opencode.jsonc found in search paths");
  return json({
    content: "",
    path: null,
    found: false,
  });
}
