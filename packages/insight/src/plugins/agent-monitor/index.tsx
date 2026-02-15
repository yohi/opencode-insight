import { createEffect } from "solid-js";
import { For } from "solid-js/web";
import { store } from "~/core/store";
import { Card } from "~/mocks/ui";

export default function AgentMonitor() {
  return (
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Agent Monitor</h1>
        <span class={`px-2 py-1 rounded text-sm ${store.status === "connected" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {store.status === "connected" ? "Live" : "Disconnected"}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card class="md:col-span-2">
          <h2 class="text-lg font-semibold mb-2">Live Logs</h2>
          <div class="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded h-96 overflow-y-auto">
            {store.logs.length === 0 ? (
              <div class="text-gray-500 italic">Waiting for logs...</div>
            ) : (
              <For each={store.logs}>
                {(log) => <div class="mb-1">{log}</div>}
              </For>
            )}
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-semibold mb-2">Agent State</h2>
          <div class="space-y-2">
            <div>
              <span class="text-gray-500 text-sm">Status:</span>
              <div class="font-medium">Idle</div>
            </div>
            <div>
              <span class="text-gray-500 text-sm">Current Task:</span>
              <div class="font-medium">-</div>
            </div>
            <div>
              <span class="text-gray-500 text-sm">Last Action:</span>
              <div class="font-medium">-</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
