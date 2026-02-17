import { For, Show, createEffect, createMemo, onMount, onCleanup } from "solid-js";
import { store, sendWebSocketMessage } from "~/core/store";
import type { Agent } from "~/core/types";
import { Card, Badge, Stack } from "~/core/ui-kit";

export default function AgentMonitor() {
  let logContainer: HTMLDivElement | undefined;

  onMount(() => {
    sendWebSocketMessage({ type: "SUBSCRIBE", topic: "logs" });
  });

  onCleanup(() => {
    sendWebSocketMessage({ type: "UNSUBSCRIBE", topic: "logs" });
  });

  // Auto-scroll logs
  createEffect(() => {
    // Access logs length to track dependency
    store.logs.length;
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

  const agentsList = createMemo(() => Object.values(store.agents));


  const statusIcons = {
    thinking: { icon: "thinking", label: "Thinking...", color: "text-purple-600" },
    busy: { icon: "tool", label: "Executing Tool", color: "text-blue-600" },
    idle: { icon: "idle", label: "Waiting for instructions", color: "text-gray-600" },
    error: { icon: "error", label: "Error encountered", color: "text-red-600" },
  } as const;

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "busy": return "text-blue-500 bg-blue-50 border-blue-100";
      case "thinking": return "text-amber-500 bg-amber-50 border-amber-100";
      case "error": return "text-red-500 bg-red-50 border-red-100";
      default: return "text-gray-400 bg-gray-50 border-gray-100";
    }
  };


  return (
    <div class="h-full flex flex-col p-6 space-y-6 bg-gray-50/50">
      {/* Header */}
      <div class="flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Agent Monitor</h1>
          <p class="text-sm text-gray-500">Real-time system observation</p>
        </div>
        <Badge class={`px-3 py-1 rounded-full font-medium transition-colors border ${
            store.status === "connected" 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
        }`}>
            {store.status === "connected" ? "● Connected" : "○ Disconnected"}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Agent States */}
        <div class="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Agents</h2>
            <Show when={agentsList().length > 0} fallback={
                <Card class="p-6 text-center text-gray-500 border-dashed">
                    No active agents detected.
                </Card>
            }>
                <For each={agentsList()}>
                    {(agent) => (
                        <Card class="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                            <Stack spacing="space-y-3">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h3 class="font-bold text-lg">{agent.name}</h3>
                                        <div class="text-xs text-gray-400 font-mono">{agent.id}</div>
                                    </div>
                                    <span class={`px-2 py-1 text-xs font-bold rounded border ${getStatusColor(agent.status)} uppercase tracking-wide`}>
                                        {agent.status}
                                    </span>
                                </div>
                                
                                <div class="space-y-1">
                                    <div class="text-xs text-gray-500 uppercase">Current Activity</div>
                                    <div class="text-sm font-medium truncate">
                                        {(() => {
                                            const status = agent.status as keyof typeof statusIcons;
                                            const info = statusIcons[status] || statusIcons.idle;
                                            const toolName = agent.currentTool && agent.currentTool.trim();
                                            return (
                                                <span class={info.color}>
                                                    {status === "busy" && toolName
                                                        ? `Executing Tool: ${toolName}`
                                                        : info.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <Show when={agent.currentThought}>
                                    <div class="bg-purple-50 p-2 rounded text-xs text-purple-900 border border-purple-100 italic">
                                        "{agent.currentThought}"
                                    </div>
                                </Show>

                                <div class="pt-2 border-t border-gray-100">
                                    <div class="text-xs text-gray-400">Last Action:</div>
                                    <div class="text-xs text-gray-700 font-mono line-clamp-2" title={agent.lastAction}>
                                        {agent.lastAction || "None"}
                                    </div>
                                    <div class="text-right text-[10px] text-gray-400 mt-1">
                                        {new Date(agent.lastActive).toLocaleTimeString()}
                                    </div>
                                </div>
                            </Stack>
                        </Card>
                    )}
                </For>
            </Show>
        </div>

        {/* Right Column: Live Logs */}
        <div class="lg:col-span-2 flex flex-col min-h-0">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">System Logs</h2>
            <Card class="flex-1 flex flex-col bg-gray-900 border-gray-800 text-gray-300 font-mono text-sm overflow-hidden p-0 h-[600px]">
                <div class="p-2 bg-gray-800 border-b border-gray-700 text-xs flex justify-between">
                    <span>/var/log/agent.log</span>
                    <span>{store.logs.length} lines</span>
                </div>
                <div ref={logContainer} class="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth">
                    <Show when={store.logs.length > 0} fallback={
                        <div class="h-full flex items-center justify-center text-gray-600 italic">
                            Waiting for log stream...
                        </div>
                    }>
                        <For each={store.logs}>
                            {(log, i) => (
                                <div class="flex gap-2 font-mono text-xs hover:bg-white/5 px-1 rounded">
                                    <span class="text-gray-600 w-6 text-right select-none">{i() + 1}</span>
                                    <span class={`break-all ${
                                        log.includes("[ERROR]") ? "text-red-400" :
                                        log.includes("[WARN]") ? "text-amber-400" :
                                        "text-gray-300"
                                    }`}>
                                        {log}
                                    </span>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}

