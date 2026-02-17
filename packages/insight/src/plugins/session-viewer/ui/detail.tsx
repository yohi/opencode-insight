import { createResource, For, Show, createSignal, onMount } from "solid-js";
import { useParams } from "solid-start";
import { Badge, Card } from "~/core/ui-kit";
import { store, setStore } from "~/core/store";
import { SolidMarkdown } from "solid-markdown";
import type { Message, SessionWithDetails } from "~/core/types";

function normalizeTimestampToMs(value: string | number): number {
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (isNaN(parsed)) return Date.now();
    return parsed;
  }
  // Assume seconds if small (heuristic: less than 10 billion, covering up to year 2286)
  // Otherwise assume milliseconds
  return value < 10000000000 ? value * 1000 : value;
}

async function fetchSessionDetails(id: string) {
  if (!id) throw new Error("Invalid session ID");
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) throw new Error("Failed to fetch session details");
  const data = (await response.json()) as SessionWithDetails;

  setStore("sessions", id, (prev) => {
    // Correctly type incoming and existing messages
    const existing = (prev?.messages || []) as Message[];
    const incoming = (data.messages || []) as Message[];

    // Create a new merged array to avoid mutating existing state
    const merged = [...existing];

    incoming.forEach((m) => {
      // Use Message type for comparison
      const isDuplicate = merged.some(
        (e) => e.timestamp === m.timestamp && e.content === m.content && e.role === m.role
      );
      if (!isDuplicate) {
        merged.push(m);
      }
    });

    // Sort using proper timestamp comparison
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
}

export default function SessionDetail() {
  const params = useParams();
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => {
    setIsMounted(true);
  });

  // Only fetch on client side after mount to avoid SSR fetch errors
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
      
      <Show when={session()} fallback={(isMounted() && !resource.loading) ? <div class="p-4 text-red-500">Session not found or error occurred.</div> : null}>
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
            {(msg: Message) => (
              <div class={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card class={`max-w-2xl ${msg.role === "user" ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"}`}>
                  <div class="text-xs text-gray-500 mb-1 font-semibold uppercase">{msg.role}</div>
                  <div class="prose prose-sm markdown-body">
                    <SolidMarkdown children={msg.content} skipHtml={true} />
                  </div>
                  <div class="text-xs text-gray-400 mt-2 text-right">
                    {new Date(normalizeTimestampToMs(msg.timestamp)).toLocaleTimeString()}
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
