import { For, Show, createEffect, createMemo, onMount, onCleanup } from "solid-js";
import { store, sendWebSocketMessage } from "~/core/store";
import type { Agent } from "~/core/types";
import { Card, Badge } from "~/core/ui-kit";

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
  const primaryAgent = createMemo(() => agentsList()[0]); // Focus on the first agent for the dashboard view

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "busy": return "text-blue-500 bg-blue-50 border-blue-100";
      case "thinking": return "text-amber-500 bg-amber-50 border-amber-100";
      case "error": return "text-red-500 bg-red-50 border-red-100";
      default: return "text-gray-400 bg-gray-50 border-gray-100";
    }
  };
  
  const getStatusLabel = (status: Agent["status"]) => {
      switch (status) {
        case "busy": return "Busy";
        case "thinking": return "Thinking";
        case "error": return "Error";
        default: return "Idle";
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

      <Show when={primaryAgent()} fallback={
          <div class="flex-1 flex items-center justify-center">
              <Card class="p-12 text-center border-dashed border-2 border-gray-200 bg-transparent shadow-none">
                  <div class="text-gray-300 mb-4 text-6xl">🤖</div>
                  <h3 class="text-lg font-medium text-gray-900">No Active Agent</h3>
                  <p class="text-gray-500 mt-1">Waiting for system activity...</p>
              </Card>
          </div>
      }>
        {(agent) => (
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column: Status & Current Action (Dashboard Style) */}
                <div class="lg:col-span-1 flex flex-col gap-6">
                    {/* Large Status Card */}
                    <Card class={`p-8 flex flex-col items-center justify-center text-center transition-all duration-500 shadow-sm border-t-4 ${
                        agent.status === 'busy' ? "border-t-blue-500" :
                        agent.status === 'thinking' ? "border-t-amber-500" :
                        agent.status === 'error' ? "border-t-red-500" :
                        "border-t-gray-400"
                    }`}>
                        <div class={`w-32 h-32 rounded-full flex items-center justify-center mb-6 text-5xl border-4 transition-colors duration-500 ${getStatusColor(agent.status)}`}>
                             {/* Icon based on status */}
                             <Show when={agent.status === 'busy'}><span class="animate-pulse">⚙️</span></Show>
                             <Show when={agent.status === 'thinking'}><span class="animate-bounce">🤔</span></Show>
                             <Show when={agent.status === 'error'}><span>⚠️</span></Show>
                             <Show when={agent.status === 'idle'}><span>💤</span></Show>
                        </div>
                        <h2 class="text-4xl font-black text-gray-900 uppercase tracking-widest mb-2">
                            {getStatusLabel(agent.status)}
                        </h2>
                        <div class="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider mt-2">
                            <span>ID: {agent.id}</span>
                            <span>•</span>
                            <span>{new Date(agent.lastActive).toLocaleTimeString()}</span>
                        </div>
                    </Card>

                    {/* Current Action / Thought */}
                    <Card class="p-0 flex-1 flex flex-col shadow-sm border-gray-200 overflow-hidden">
                        <div class="bg-gray-50 border-b border-gray-100 p-4">
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Current Activity
                            </h3>
                        </div>
                        <div class="flex-1 p-6 flex flex-col justify-center">
                             <Show when={agent.status === 'thinking'} fallback={
                                 <Show when={agent.currentTool} fallback={
                                     <div class="text-center text-gray-300 italic py-4">
                                         No specific activity active
                                     </div>
                                 }>
                                     <div class="text-center w-full">
                                         <div class="text-xs text-blue-500 font-mono mb-2 uppercase font-bold">Executing Tool</div>
                                         <div class="text-xl font-bold text-gray-800 break-words font-mono bg-blue-50/50 p-4 rounded-lg border border-blue-100 w-full">
                                             {agent.currentTool}
                                         </div>
                                     </div>
                                 </Show>
                             }>
                                 <div class="text-center w-full">
                                     <div class="text-xs text-amber-500 font-mono mb-2 uppercase font-bold">Reasoning</div>
                                     <div class="text-lg font-medium text-gray-700 italic leading-relaxed bg-amber-50/50 p-6 rounded-lg border border-amber-100 w-full relative">
                                         <span class="absolute top-2 left-2 text-4xl text-amber-200 opacity-50">"</span>
                                         {agent.currentThought || "Processing..."}
                                         <span class="absolute bottom-[-10px] right-4 text-4xl text-amber-200 opacity-50">"</span>
                                     </div>
                                 </div>
                             </Show>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Log Stream */}
                <div class="lg:col-span-2 flex flex-col min-h-0">
                    <Card class="flex-1 flex flex-col bg-[#0d1117] border-gray-800 shadow-inner overflow-hidden p-0 text-gray-300">
                        <div class="p-3 bg-[#161b22] border-b border-gray-800 flex justify-between items-center shrink-0">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-gray-700"></span>
                                <span class="text-xs font-mono text-gray-400 font-bold">SYSTEM LOGS</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] text-gray-500 uppercase tracking-wider">/var/log/agent.log</span>
                                <Badge class="bg-gray-800 text-gray-400 border-gray-700 text-[10px]">
                                    {store.logs.length} EVENTS
                                </Badge>
                            </div>
                        </div>
                        
                        <div 
                            ref={logContainer} 
                            class="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                        >
                            <Show when={store.logs.length > 0} fallback={
                                <div class="h-full flex flex-col items-center justify-center text-gray-700 space-y-2 opacity-50">
                                    <span class="text-4xl grayscale">📝</span>
                                    <span>Waiting for system events...</span>
                                </div>
                            }>
                                <For each={store.logs}>
                                    {(log, i) => (
                                        <div class="group flex gap-3 hover:bg-white/5 rounded px-2 py-1 transition-colors">
                                            <span class="text-gray-600 select-none w-8 text-right shrink-0 text-xs py-0.5 opacity-50">{i() + 1}</span>
                                            <span class={`break-all whitespace-pre-wrap leading-relaxed ${
                                                log.match(/Error/i) ? "text-red-400" :
                                                log.match(/Warning/i) ? "text-amber-400" :
                                                log.match(/Success/i) ? "text-green-400" :
                                                "text-gray-300"
                                            }`}>{log}</span>
                                        </div>
                                    )}
                                </For>
                            </Show>
                        </div>
                    </Card>
                </div>
            </div>
        )}
      </Show>
    </div>
  );
}

