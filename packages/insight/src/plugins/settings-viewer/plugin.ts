import { InsightPlugin } from "~/core/plugin";
import SettingsViewer from "./ui";

const plugin: InsightPlugin = {
  id: "settings-viewer",
  name: "Settings",
  icon: "settings",
  routes: [
    { path: "/settings", component: SettingsViewer },
  ],
  sidebarItems: [
    { label: "Settings", href: "/settings", icon: "settings" }
  ]
};

export default plugin;
