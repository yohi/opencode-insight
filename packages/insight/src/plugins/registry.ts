import { InsightPlugin } from "~/core/plugin";

export const plugins: InsightPlugin[] = [
  {
    id: "session-viewer",
    name: "Sessions",
    sidebarItems: [
      { label: "Sessions", href: "/sessions", icon: "list" }
    ]
  },
  {
    id: "agent-monitor",
    name: "Agent Monitor",
    sidebarItems: [
      { label: "Agent Monitor", href: "/agent-monitor", icon: "activity" }
    ]
  },
  {
    id: "settings-viewer",
    name: "Settings",
    sidebarItems: [
      { label: "Settings", href: "/settings", icon: "settings" }
    ]
  },
  {
    id: "raw-data-viewer",
    name: "Raw Data",
    sidebarItems: [
      { label: "Raw Data", href: "/raw-data", icon: "database" }
    ]
  }
];
