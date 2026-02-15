import { createResource, For, Show } from "solid-js";
import { useParams } from "solid-start";
import { Badge, Card } from "~/mocks/ui";

async function fetchSessionDetails(id: string) {
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) throw new Error("Failed to fetch session details");
  return response.json();
}

export default function SessionDetail() {
  const params = useParams();
  const [session] = createResource(() => params.id, fetchSessionDetails);

  return (
    <div class="space-y-4">
      <Show when={!session.loading} fallback={<div class="p-4">Loading details...</div>}>
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">{session().title}</h1>
          <Badge class={
            session().status === "completed" ? "bg-green-100 text-green-800" :
            session().status === "error" ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }>
            {session().status}
          </Badge>
        </div>

        <div class="space-y-4">
          <For each={session().messages}>
            {(msg: any) => (
              <div class={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card class={`max-w-2xl ${msg.role === "user" ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"}`}>
                  <div class="text-xs text-gray-500 mb-1 font-semibold uppercase">{msg.role}</div>
                  <div class="prose prose-sm">
                    {msg.content}
                  </div>
                  <div class="text-xs text-gray-400 mt-2 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
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
