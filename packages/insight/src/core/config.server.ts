import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export interface InsightConfig {
  plugins: {
    enabled: string[];
    disabled: string[];
  };
}

const DEFAULT_CONFIG: InsightConfig = {
  plugins: {
    enabled: [],
    disabled: [],
  },
};

/**
 * Resolves ~ to home directory
 */
function expandHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Strips comments from jsonc content
 */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
}

export async function loadConfig(): Promise<InsightConfig> {
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
        const rawContent = await fs.readFile(configPath, "utf-8");
        const cleanContent = stripComments(rawContent);
        const parsed = JSON.parse(cleanContent);

        // Merge with defaults to ensure structure
        return {
          plugins: {
            enabled: Array.isArray(parsed.plugins?.enabled) ? parsed.plugins.enabled : [],
            disabled: Array.isArray(parsed.plugins?.disabled) ? parsed.plugins.disabled : [],
          },
        };
      } catch (err) {
        console.error(`[Config] Error reading or parsing config at ${configPath}:`, err);
        // Continue to next path if error occurs
      }
    }
  }

  return DEFAULT_CONFIG;
}
