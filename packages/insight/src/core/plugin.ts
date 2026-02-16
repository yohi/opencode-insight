import type { RouteDefinition } from "@solidjs/router";

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
}

export interface APIContext {
  request: Request;
  params: Record<string, string>;
}

export interface ServerContext {
  wsServer: any; // specific type if available
  db: any; // specific type if available
}

export interface InsightPlugin {
  id: string;
  name: string;
  icon?: string;
  
  // UI Injection
  routes?: RouteDefinition[];
  sidebarItems?: SidebarItem[];
  
  // Backend Injection (Server-side)
  api?: {
    [endpoint: string]: (ctx: APIContext) => Promise<Response>;
  };
  onLoad?: (ctx: ServerContext) => void | Promise<void>;
}
