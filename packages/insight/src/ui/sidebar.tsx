import { A } from "solid-start";
import { For } from "solid-js";
import { store } from "~/core/store";
import { loadPlugins } from "~/core/plugin-loader";

export default function Sidebar() {
  const plugins = loadPlugins();
  return (
    <div class="w-64 bg-gray-900 text-white h-screen flex flex-col border-r border-gray-800">
      <div class="p-4 border-b border-gray-800">
        <h1 class="text-xl font-bold">Insight</h1>
      </div>
      <nav class="flex-1 p-4 space-y-2">
        <A href="/" class="block px-4 py-2 rounded hover:bg-gray-800" activeClass="bg-gray-800">
          Home
        </A>
        <For each={plugins}>
          {(plugin) => (
            <For each={plugin.sidebarItems ?? []}>
              {(item) => (
                <A href={item.href} class="block px-4 py-2 rounded hover:bg-gray-800" activeClass="bg-gray-800">
                  {item.label}
                </A>
              )}
            </For>
          )}
        </For>
      </nav>
      <div class="p-4 border-t border-gray-800 text-sm text-gray-400">
        Status: <span class={store.status === "connected" ? "text-green-400" : "text-red-400"}>{store.status}</span>
      </div>
    </div>
  );
}
