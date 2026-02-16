export * from "~/plugins/registry";
import { plugins } from "~/plugins/registry";

/**
 * @deprecated Use registry instead.
 */
export function loadPlugins() {
  return plugins;
}
