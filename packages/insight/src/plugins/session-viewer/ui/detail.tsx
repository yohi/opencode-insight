import { createResource, For, Show, createEffect, createSignal, onMount } from "solid-js";
import { useParams } from "solid-start";
import { Badge, Card } from "~/core/ui-kit";
import { store, setStore } from "~/core/store";
import { SolidMarkdown } from "solid-markdown";

async function fetchSessionDetails(id: string) {
  if (!id) throw new Error("Invalid session ID");
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) throw new Error("Failed to fetch session details");
  const data = await response.json();
  
  // Merge with existing data in store to preserve real-time updates
  setStore("sessions", id, (prev) => ({
    ...(prev || {}),
    ...data,
    // Preserve messages if they were already updating via WebSocket
    messages: (() => {
      const existing = prev?.messages || [];
      const incoming = data.messages || [];
      const merged = [...existing];
      
      incoming.forEach((m: any) => {
        const isDuplicate = merged.some(
          (e: any) => e.timestamp === m.timestamp && e.content === m.content
        );
        if (!isDuplicate) {
          merged.push(m);
        }
      });
      
      return merged.sort((a: any, b: any) => a.timestamp - b.timestamp);
    })()
  }));
  
  return data;
}

export default function SessionDetail() {
  const params = useParams();
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => {
    setIsMounted(true);
  });

  const [resource] = createResource(
    () => (isMounted() ? params.id : false),
    fetchSessionDetails,
  );

  const session = () => (params.id ? store.sessions[params.id] : undefined);

  return (
    <div class="space-y-4">
      <Show when={resource.loading && !session()} fallback={null}>
        <div class="p-4">Loading details...</div>
      </Show>
      
      <Show when={session()} fallback={<div class="p-4 text-red-500">Session not found or error occurred.</div>}>
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">{session()?.title}</h1>
          <Badge class={
            session()?.status === "completed" ? "bg-green-100 text-green-800" :
            session()?.status === "error" ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }>
            {session()?.status}
          </Badge>
        </div>

        <div class="space-y-4">
          <For each={session()?.messages}>
            {(msg: any) => (
              <div class={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card class={`max-w-2xl ${msg.role === "user" ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"}`}>
                  <div class="text-xs text-gray-500 mb-1 font-semibold uppercase">{msg.role}</div>
                  <div class="prose prose-sm markdown-body">
                    <SolidMarkdown children={msg.content} skipHtml={true} />
                  </div>
                  <div class="text-xs text-gray-400 mt-2 text-right">
                    {new Date(typeof msg.timestamp === 'number' ? msg.timestamp * 1000 : msg.timestamp).toLocaleTimeString()}
                  </div>
                </Card>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
