export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
}

export interface InsightPlugin {
  id: string;
  name: string;
  sidebarItems: SidebarItem[];
  // Future extension points
  // routes?: any[];
}
