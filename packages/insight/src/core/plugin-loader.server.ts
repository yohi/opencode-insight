import type { InsightPlugin } from "~/core/plugin";

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
