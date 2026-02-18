import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { expandHome, CONFIG_SEARCH_PATHS } from "./path-utils";
import { parse } from "jsonc-parser";

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

export async function loadConfig(): Promise<InsightConfig> {
  for (const rawPath of CONFIG_SEARCH_PATHS) {
    if (!rawPath) continue;
    const configPath = expandHome(rawPath);

    if (existsSync(configPath)) {
      try {
        const rawContent = await fs.readFile(configPath, "utf-8");
        const parsed = parse(rawContent);

        // Merge with defaults to ensure structure
        return {
          plugins: {
            enabled: Array.isArray(parsed?.plugins?.enabled) ? parsed.plugins.enabled : [],
            disabled: Array.isArray(parsed?.plugins?.disabled) ? parsed.plugins.disabled : [],
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
