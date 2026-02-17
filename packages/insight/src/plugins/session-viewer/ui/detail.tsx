import { createResource, For, Show, createSignal, onMount, createEffect, onCleanup } from "solid-js";
import { useParams } from "solid-start";
import { Badge } from "~/ui/badge";
import { store, setStore, sendWebSocketMessage } from "~/core/store";
import { SolidMarkdown } from "solid-markdown";
import type { Message, SessionWithDetails, Usage } from "~/core/types";

// Helper to handle inconsistent timestamps
function normalizeTimestampToMs(value: string | number | Date | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return 0;

    const num = Number(trimmed);
    if (!isNaN(num)) {
      // Heuristic: less than 10 billion -> seconds, else milliseconds
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = new Date(value).getTime();
    if (isNaN(parsed)) return 0;
    return parsed;
  }
  
  // Number
  return value < 10000000000 ? value * 1000 : value;
}

async function fetchSessionDetails(id: string) {
  if (!id) throw new Error("Invalid session ID");
  
  try {
    const response = await fetch(`/api/sessions/${id}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error("Session not found");
      throw new Error(`Failed to fetch session details: ${response.statusText}`);
    }
    
    const data = (await response.json()) as SessionWithDetails;

    setStore("sessions", id, (prev) => {
      // Correctly type incoming and existing messages
      const existing = (prev?.messages || []) as Message[];
      const incoming = (data.messages || []) as Message[];
      
      // Create a new merged array to avoid mutating existing state
      const merged = [...existing];
      const existingIds = new Set(existing.map(m => m.id));

      incoming.forEach(m => {
        if (!existingIds.has(m.id)) {
          merged.push(m);
          existingIds.add(m.id);
        }
      });

      // Sort by timestamp
      merged.sort((a, b) => {
        return normalizeTimestampToMs(a.timestamp) - normalizeTimestampToMs(b.timestamp);
      });

      return {
        ...(prev || {}),
        ...data,
        messages: merged,
      };
    });

    return data;
  } catch (err) {
    console.error("Error fetching session details:", err);
    throw err;
  }
}

export default function SessionDetail() {
  const params = useParams();
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => {
    setIsMounted(true);
  });

  createEffect(() => {
    const id = params.id;
    if (id) {
      const topic = `session:${id}` as const;
      
      sendWebSocketMessage({
        type: "SUBSCRIBE",
        topic,
      });

      onCleanup(() => {
        sendWebSocketMessage({
          type: "UNSUBSCRIBE",
          topic,
        });
      });
    }
  });

  const [resource] = createResource(
    () => (isMounted() ? params.id : false),
    fetchSessionDetails
  );

  const session = () => (params.id ? store.sessions[params.id] : undefined);

  const statusVariant = (status?: string | null) => {
    switch (status) {
      case "completed": return "success";
      case "error": return "error";
      case "active": return "warning";
      default: return "default";
    }
  };

  const formatDate = (ts?: string | number | Date | null) => {
    if (!ts) return "N/A";
    return new Date(normalizeTimestampToMs(ts)).toLocaleString();
  };
  
  const formatTime = (ts?: string | number | Date | null) => {
    if (!ts) return "";
    return new Date(normalizeTimestampToMs(ts)).toLocaleTimeString();
  };

  return (
    <div class="space-y-6 pb-20">
      <Show when={resource.loading && !session()} fallback={null}>
        <div class="flex items-center justify-center p-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500"></div>
        </div>
      </Show>

      <Show when={resource.error}>
        <div class="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          <p class="font-bold">Error loading session</p>
          <p class="text-sm">{resource.error.message}</p>
        </div>
      </Show>
      
      <Show when={session()}>
        {/* Sticky Header */}
        <div class="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 -mx-4 px-4 py-4 sticky top-0 z-10 shadow-sm transition-all">
          <div class="max-w-4xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 class="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1 truncate max-w-lg">
                  {session()?.title || "Untitled Session"}
                </h1>
                <div class="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                  <span class="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {session()?.id.substring(0, 8)}
                  </span>
                  <span>•</span>
                  <span>{formatDate(session()?.createdAt)}</span>
                </div>
              </div>
              
              <div class="flex items-center gap-3">
                <Badge variant={statusVariant(session()?.status)}>
                  {session()?.status || "unknown"}
                </Badge>
                
                <Show when={session()?.usage}>
                  {(u: Usage) => (
                    <Badge variant="default" class="font-mono">
                      {u.totalTokens?.toLocaleString() ?? 0} tokens
                    </Badge>
                  )}
                </Show>
              </div>
            </div>

            {/* Usage Stats Detail */}
            <Show when={session()?.usage}>
               {(u: Usage) => (
                 <div class="mt-3 flex gap-6 text-xs text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                   <div class="flex items-center gap-1">
                     <span class="uppercase tracking-wider text-[10px]">Input</span>
                     <span class="font-medium text-neutral-700 dark:text-neutral-300 font-mono">{u.inputTokens?.toLocaleString() ?? 0}</span>
                   </div>
                   <div class="flex items-center gap-1">
                     <span class="uppercase tracking-wider text-[10px]">Output</span>
                     <span class="font-medium text-neutral-700 dark:text-neutral-300 font-mono">{u.outputTokens?.toLocaleString() ?? 0}</span>
                   </div>
                   <div class="flex items-center gap-1">
                     <span class="uppercase tracking-wider text-[10px]">Total</span>
                     <span class="font-medium text-neutral-700 dark:text-neutral-300 font-mono">{u.totalTokens?.toLocaleString() ?? 0}</span>
                   </div>
                 </div>
               )}
            </Show>
          </div>
        </div>

        {/* Messages List */}
        <div class="max-w-4xl mx-auto pt-6 px-4 md:px-0">
          <div class="space-y-8">
            <For each={session()?.messages}>
              {(msg: Message) => (
                <div class={`flex w-full group ${
                  msg.role === "user" 
                    ? "justify-end" 
                    : msg.role === "system" 
                      ? "justify-center" 
                      : "justify-start"
                }`}>
                  <div class={`
                    relative max-w-[85%] rounded-2xl p-5 shadow-sm border transition-all
                    ${msg.role === "user" 
                      ? "bg-blue-600 text-white border-blue-600 rounded-br-none" 
                      : msg.role === "system"
                        ? "bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 text-xs border-transparent shadow-none max-w-lg text-center font-medium my-4 px-8 py-2"
                        : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 rounded-bl-none"
                    }
                  `}>
                    {/* Role Label for AI/System */}
                    <Show when={msg.role !== "user" && msg.role !== "system"}>
                      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-700/50">
                        <div class="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">
                          AI
                        </div>
                        <span class="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 select-none">
                          {msg.role}
                        </span>
                        <span class="text-[10px] text-neutral-400 ml-auto">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </Show>

                    {/* Content */}
                    <div class={`prose prose-sm max-w-none break-words ${
                      msg.role === "user" 
                        ? "prose-invert prose-p:leading-relaxed prose-pre:bg-blue-700 prose-pre:border-blue-500" 
                        : "dark:prose-invert prose-neutral prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800"
                    }`}>
                      <SolidMarkdown children={msg.content || ""} />
                    </div>
                    
                    {/* Timestamp for User */}
                    <Show when={msg.role === "user"}>
                      <div class="text-[10px] mt-2 opacity-70 text-right select-none text-blue-100 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.timestamp)}
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
            
            <Show when={session()?.messages?.length === 0}>
              <div class="flex flex-col items-center justify-center py-20 text-neutral-400">
                <div class="text-4xl mb-4">💬</div>
                <p>No messages in this session yet.</p>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
