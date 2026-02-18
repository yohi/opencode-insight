import type { InsightPlugin } from "~/core/plugin";
import fs from "fs/promises";
import path from "path";
import { loadConfig } from "./config.server";
import { validatePlugin } from "./plugin-validator";

type PluginModule = { default: InsightPlugin };

let cachedPlugins: InsightPlugin[] | null = null;

// waitForPromise removed

function getPluginExport(module: unknown): unknown {
  if (module && typeof module === "object" && "default" in module) {
    return (module as { default: unknown }).default;
  }

  return module;
}

async function loadExternalPlugins(localPlugins: InsightPlugin[]): Promise<InsightPlugin[]> {
  const candidates = await discoverExternalPlugins();
  const config = await loadConfig();
  const enabled = new Set(config.plugins.enabled);
  const disabled = new Set(config.plugins.disabled);

  const filteredCandidates = candidates.filter((pkg) => {
    if (disabled.has(pkg)) {
      console.info(`[PluginLoader] Skipping external plugin \"${pkg}\": disabled by config`);
      return false;
    }

    if (enabled.size > 0 && !enabled.has(pkg)) {
      console.info(`[PluginLoader] Skipping external plugin \"${pkg}\": not in enabled allowlist`);
      return false;
    }

    return true;
  });

  const localIds = new Set(localPlugins.map((plugin) => plugin.id));
  const externalIds = new Set<string>();
  const externalPlugins: InsightPlugin[] = [];

  for (const pkg of filteredCandidates) {
    let loadedModule: unknown;

    try {
      loadedModule = await import(/* @vite-ignore */ `${pkg}/server`);
    } catch (serverError) {
      try {
        loadedModule = await import(/* @vite-ignore */ pkg);
      } catch (packageError) {
        console.error(`[PluginLoader] Failed to load external plugin \"${pkg}\"`, {
          serverError,
          packageError,
        });
        continue;
      }
    }

    const pluginCandidate = getPluginExport(loadedModule);

    if (!validatePlugin(pluginCandidate)) {
      console.warn(`[PluginLoader] Skipping external plugin \"${pkg}\": validation failed`);
      continue;
    }

    if (localIds.has(pluginCandidate.id)) {
      console.warn(
        `[PluginLoader] Plugin id conflict for \"${pluginCandidate.id}\" from \"${pkg}\". Keeping local plugin.`
      );
      continue;
    }

    if (externalIds.has(pluginCandidate.id)) {
      console.warn(
        `[PluginLoader] Duplicate external plugin id \"${pluginCandidate.id}\" from \"${pkg}\". Keeping first loaded plugin.`
      );
      continue;
    }

    externalIds.add(pluginCandidate.id);
    externalPlugins.push(pluginCandidate);
    console.info(`[PluginLoader] Loaded external plugin \"${pluginCandidate.id}\" from \"${pkg}\"`);
  }

  return externalPlugins;
}

export async function loadPlugins(): Promise<InsightPlugin[]> {
  if (cachedPlugins) {
    return cachedPlugins;
  }

  const modules = import.meta.glob<PluginModule>("~/plugins/*/plugin.server.ts", { eager: true });
  const localPlugins = Object.values(modules)
    .map((mod) => mod.default)
    .filter(Boolean);

  try {
    const externalPlugins = await loadExternalPlugins(localPlugins);
    cachedPlugins = [...localPlugins, ...externalPlugins];
  } catch (error) {
    console.error("[PluginLoader] Failed to load external plugins, using local plugins only", error);
    cachedPlugins = localPlugins;
  }

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
