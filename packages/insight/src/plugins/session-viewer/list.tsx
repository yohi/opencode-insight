import { createResource, For, Show } from "solid-js";
import { A } from "solid-start";
import { Badge, Card, Input } from "~/mocks/ui";

async function fetchSessions() {
  const response = await fetch("/api/sessions");
  if (!response.ok) throw new Error("Failed to fetch sessions");
  return response.json();
}

export default function SessionList() {
  const [sessions] = createResource(fetchSessions);

  return (
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Sessions</h1>
        <Input placeholder="Search sessions..." class="w-64" />
      </div>

      <Show when={!sessions.loading} fallback={<div class="p-4">Loading sessions...</div>}>
        <div class="space-y-2">
          <For each={sessions()}>
            {(session: any) => (
              <A href={`/sessions/${session.id}`} class="block no-underline text-inherit">
                <Card class="hover:bg-gray-50 transition-colors cursor-pointer flex justify-between items-center">
                  <div>
                    <h3 class="font-semibold text-lg">{session.title || "Untitled Session"}</h3>
                    <p class="text-sm text-gray-500">ID: {session.id}</p>
                  </div>
                  <div class="flex items-center space-x-4">
                    <span class="text-sm text-gray-400">
                      {new Date(session.updatedAt).toLocaleString()}
                    </span>
                    <Badge class={
                      session.status === "completed" ? "bg-green-100 text-green-800" :
                      session.status === "error" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }>
                      {session.status}
                    </Badge>
                  </div>
                </Card>
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
