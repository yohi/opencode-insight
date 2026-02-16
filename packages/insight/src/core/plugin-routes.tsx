import { Route } from "solid-start";
import { loadPlugins } from "~/core/plugin-loader";

export default function PluginRoutes() {
  const plugins = loadPlugins();
  const routes = plugins.flatMap((p) => p.routes || []);

  return <>{routes.map((r) => <Route path={r.path} component={r.component} />)}</>;
}
