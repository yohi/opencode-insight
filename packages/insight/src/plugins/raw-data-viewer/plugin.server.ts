import type { InsightPlugin } from "~/core/plugin";
import basePlugin from "./plugin";
import { getRawData, runSql } from "./api";

const plugin: InsightPlugin = {
  ...basePlugin,
  api: {
    "raw-data": getRawData,
    sql: runSql,
  },
};

export default plugin;
