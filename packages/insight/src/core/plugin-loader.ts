import { InsightPlugin } from "~/core/plugin";
import sessionViewer from "~/plugins/session-viewer/plugin";
import agentMonitor from "~/plugins/agent-monitor/plugin";
import settingsViewer from "~/plugins/settings-viewer/plugin";
import rawDataViewer from "~/plugins/raw-data-viewer/plugin";

const plugins: InsightPlugin[] = [
  sessionViewer,
  agentMonitor,
  settingsViewer,
  rawDataViewer
];

export function loadPlugins(): InsightPlugin[] {
  return plugins;
}
