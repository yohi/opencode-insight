import { createResource, For, Show, createEffect } from "solid-js";
import { useParams } from "solid-start";
import { Badge, Card } from "~/core/ui-kit";
import { store, setStore } from "~/core/store";
import { SolidMarkdown } from "solid-markdown";

async function fetchSessionDetails(id: string) {
  if (!id) throw new Error("Invalid session ID");
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) throw new Error("Failed to fetch session details");
  const data = await response.json();
  setStore("sessions", id, data);
  return data;
}

export default function SessionDetail() {
  const params = useParams();
  const [resource] = createResource(() => params.id, fetchSessionDetails);

  const session = () => store.sessions[params.id];

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
                    <SolidMarkdown children={msg.content} />
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
