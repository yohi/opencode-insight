import { InsightPlugin } from "~/core/plugin";
import AgentMonitor from "./ui";

const plugin: InsightPlugin = {
  id: "agent-monitor",
  name: "Agent Monitor",
  icon: "activity",
  routes: [
    { path: "/agent-monitor", component: AgentMonitor },
  ],
  sidebarItems: [
    { label: "Agent Monitor", href: "/agent-monitor", icon: "activity" }
  ]
};

export default plugin;
