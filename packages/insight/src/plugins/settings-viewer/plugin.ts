import { InsightPlugin } from "~/core/plugin";

const plugin: InsightPlugin = {
  id: "settings-viewer",
  name: "Settings",
  icon: "settings",
  sidebarItems: [
    { label: "Settings", href: "/settings", icon: "settings" }
  ]
};

export default plugin;
