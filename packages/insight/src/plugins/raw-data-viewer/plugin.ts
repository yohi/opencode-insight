import { InsightPlugin } from "~/core/plugin";

const plugin: InsightPlugin = {
  id: "raw-data-viewer",
  name: "Raw Data",
  icon: "database",
  sidebarItems: [
    { label: "Raw Data", href: "/raw-data", icon: "database" }
  ]
};

export default plugin;
