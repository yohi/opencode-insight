import { InsightPlugin } from "~/core/plugin";
import RawDataViewer from "./ui";

const plugin: InsightPlugin = {
  id: "raw-data-viewer",
  name: "Raw Data",
  icon: "database",
  routes: [
    { path: "/raw-data", component: RawDataViewer },
  ],
  sidebarItems: [
    { label: "Raw Data", href: "/raw-data", icon: "database" }
  ]
};

export default plugin;
