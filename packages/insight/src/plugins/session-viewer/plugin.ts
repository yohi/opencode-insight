import { InsightPlugin } from "~/core/plugin";

const plugin: InsightPlugin = {
  id: "session-viewer",
  name: "Sessions",
  icon: "list",
  sidebarItems: [
    { label: "Sessions", href: "/sessions", icon: "list" }
  ]
};

export default plugin;
