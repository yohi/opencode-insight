import type { InsightPlugin } from "~/core/plugin";
import basePlugin from "./plugin";
import { getSessionDetails, getSessions } from "./api";

const plugin: InsightPlugin = {
  ...basePlugin,
  api: {
    sessions: getSessions,
    "sessions/:id": getSessionDetails,
  },
};

export default plugin;
