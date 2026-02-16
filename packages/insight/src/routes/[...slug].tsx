import { useParams } from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import type { Component } from "solid-js";
import { loadPlugins } from "~/core/plugin-loader";
import { Dynamic } from "solid-js/web";

function normalizePath(value: string): string {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function splitPath(value: string): string[] {
  return normalizePath(value)
    .split("/")
    .filter(Boolean);
}

function matchRoutePattern(pattern: string, path: string): boolean {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (!p || !v) {
      return false;
    }
    if (p.startsWith(":")) {
      continue;
    }
    if (p !== v) {
      return false;
    }
  }
  return true;
}

export default function PluginDispatcherRoute() {
  const params = useParams();
  const slug = () => params.slug ?? "";
  const path = () => normalizePath(slug());

  const match = createMemo(() => {
    const plugins = loadPlugins();
    const pathname = path();
    for (const plugin of plugins) {
      for (const route of plugin.routes || []) {
        const routePath = (route as any).path as string | undefined;
        const component = (route as any).component as Component | undefined;
        if (!routePath || !component) {
          continue;
        }
        if (routePath === pathname || matchRoutePattern(routePath, pathname)) {
          return component;
        }
      }
    }
    return null;
  });

  return (
    <Show when={match()} fallback={<div class="p-6 text-gray-500">Not Found</div>}>
      <Dynamic component={match() as Component} />
    </Show>
  );
}
