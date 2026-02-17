import { InsightPlugin } from "~/core/plugin";
import SessionList from "./ui/list";
import SessionDetail from "./ui/detail";

const plugin: InsightPlugin = {
  id: "session-viewer",
  name: "Sessions",
  icon: "list",
  routes: [
    { path: "/sessions", component: SessionList },
    { path: "/sessions/:id", component: SessionDetail },
  ],
  sidebarItems: [
    { label: "Sessions", href: "/sessions", icon: "list" }
  ],
};

export default plugin;
