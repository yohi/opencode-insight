import type { InsightPlugin } from "~/core/plugin";
import fs from "fs/promises";
import path from "path";

type PluginModule = { default: InsightPlugin };

let cachedPlugins: InsightPlugin[] | null = null;

export function loadPlugins(): InsightPlugin[] {
  if (cachedPlugins) {
    return cachedPlugins;
  }

  const modules = import.meta.glob<PluginModule>("~/plugins/*/plugin.server.ts", { eager: true });
  cachedPlugins = Object.values(modules)
    .map((mod) => mod.default)
    .filter(Boolean);

  return cachedPlugins;
}

/**
 * Discovers external plugins from the project's package.json.
 * External plugins are identified by the 'opencode-plugin-' prefix.
 */
export async function discoverExternalPlugins(): Promise<string[]> {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgContent = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
    };

    const pluginNames = Object.keys(dependencies).filter((name) =>
      name.startsWith("opencode-plugin-")
    );

    return Array.from(new Set(pluginNames));
  } catch (error) {
    // Handle package.json missing or parse error gracefully
    return [];
  }
}
