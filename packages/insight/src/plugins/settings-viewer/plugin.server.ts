import type { InsightPlugin } from "~/core/plugin";
import basePlugin from "./plugin";
import { getSettings } from "./api";

const plugin: InsightPlugin = {
  ...basePlugin,
  api: {
    settings: getSettings,
  },
};

export default plugin;
