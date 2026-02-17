import { createResource, createSignal, For, Show, onMount } from "solid-js";
import { A } from "solid-start";
import { Badge, Card, Input } from "~/core/ui-kit";
import { store, setStore } from "~/core/store";

const LIMIT = 20;

async function fetchSessions(offset: number) {
  const response = await fetch(`/api/sessions?limit=${LIMIT}&offset=${offset}`);
  if (!response.ok) throw new Error("Failed to fetch sessions");
  const list = await response.json();
  
  // Update store with fetched sessions
  list.forEach((s: any) => {
    setStore("sessions", s.id, (prev) => ({ ...prev, ...s }));
  });
  
  return list;
}

export default function SessionList() {
  const [offset, setOffset] = createSignal(0);
  const [isClient, setIsClient] = createSignal(false);

  onMount(() => setIsClient(true));

  const [sessionsData] = createResource(
    () => (isClient() ? offset() : null),
    fetchSessions
  );

  // Compute sorted sessions from store
  const sessions = () => Object.values(store.sessions).sort((a, b) => {
     const timeA = new Date(typeof a.updatedAt === 'number' ? a.updatedAt * 1000 : a.updatedAt || 0).getTime();
     const timeB = new Date(typeof b.updatedAt === 'number' ? b.updatedAt * 1000 : b.updatedAt || 0).getTime();
     return timeB - timeA;
  });

  const hasMore = () => {
    const data = sessionsData();
    return data && data.length === LIMIT;
  };
  
  const isLoading = () => sessionsData.loading;

  const loadMore = () => {
    if (!isLoading() && hasMore()) {
      setOffset(prev => prev + LIMIT);
    }
  };

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

      <Show when={sessionsData.error}>
        <div class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg mb-4">
          <p class="font-semibold">Error loading sessions</p>
          <p class="text-sm">{sessionsData.error.message}</p>
        </div>
      </Show>

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

      <div class="flex justify-center py-4">
        <Show when={isLoading() && sessions().length === 0}>
           <div class="text-gray-500">Loading sessions...</div>
        </Show>

        <Show when={!sessionsData.error && !isLoading() && sessions().length === 0}>
           <div class="text-gray-500 text-lg">No sessions found</div>
        </Show>
        
        <Show when={!sessionsData.error && !isLoading() && hasMore()}>
            <button 
                onClick={loadMore}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                Load More
            </button>
        </Show>
        
        <Show when={isLoading() && sessions().length > 0}>
             <button disabled class="px-4 py-2 bg-blue-400 text-white rounded opacity-75 cursor-not-allowed">
                Loading...
             </button>
        </Show>

        <Show when={!sessionsData.error && !isLoading() && !hasMore() && sessions().length > 0}>
            <div class="text-gray-400 text-sm">No more sessions</div>
        </Show>
      </div>
    </div>
  );
}
