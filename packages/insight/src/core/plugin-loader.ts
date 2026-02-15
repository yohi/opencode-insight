export interface InsightPlugin {
  id: string;
  name: string;
  path: string;
  icon?: string;
}

export const plugins: InsightPlugin[] = [
  { id: "session-viewer", name: "Sessions", path: "/sessions", icon: "list" },
  { id: "agent-monitor", name: "Agent Monitor", path: "/agent-monitor", icon: "activity" },
  { id: "settings-viewer", name: "Settings", path: "/settings", icon: "settings" },
  { id: "raw-data-viewer", name: "Raw Data", path: "/raw-data", icon: "database" },
];

export function loadPlugins() {
  return plugins;
}
