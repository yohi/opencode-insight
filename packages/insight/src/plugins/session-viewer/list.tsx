import { createResource, For, Show } from "solid-js";
import { A } from "solid-start";
import { Badge, Card, Input } from "~/core/ui-kit";
import { store, setStore } from "~/core/store";

async function fetchSessions() {
  const response = await fetch("/api/sessions");
  if (!response.ok) throw new Error("Failed to fetch sessions");
  const list = await response.json();
  
  // Update store with fetched sessions
  list.forEach((s: any) => {
    setStore("sessions", s.id, (prev) => ({ ...prev, ...s }));
  });
  
  return list;
}

export default function SessionList() {
  const [resource] = createResource(fetchSessions);

  // Compute sorted sessions from store
  const sessions = () => Object.values(store.sessions).sort((a, b) => {
     const timeA = new Date(typeof a.updatedAt === 'number' ? a.updatedAt * 1000 : a.updatedAt || 0).getTime();
     const timeB = new Date(typeof b.updatedAt === 'number' ? b.updatedAt * 1000 : b.updatedAt || 0).getTime();
     return timeB - timeA;
  });

  const formatUpdatedAt = (value: unknown) => {
    if (!value) return "Unknown";
    const d = new Date(typeof value === "number" ? value * 1000 : (value as string));
    return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
  };

  return (
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Sessions</h1>
        <Input placeholder="Search sessions..." class="w-64" />
      </div>

      <Show when={!resource.loading} fallback={<div class="p-4">Loading sessions...</div>}>
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
                      {formatUpdatedAt(session.updatedAt)}
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
