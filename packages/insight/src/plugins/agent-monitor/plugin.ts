import { InsightPlugin } from "~/core/plugin";

const plugin: InsightPlugin = {
  id: "agent-monitor",
  name: "Agent Monitor",
  icon: "activity",
  sidebarItems: [
    { label: "Agent Monitor", href: "/agent-monitor", icon: "activity" }
  ]
};

export default plugin;
