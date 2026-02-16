import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { Card } from "~/core/ui-kit";

async function fetchTables() {
  const response = await fetch("/api/raw-data");
  if (!response.ok) throw new Error("Failed to fetch tables");
  return response.json();
}

async function fetchTableData(tableName: string) {
  if (!tableName) return [];
  const response = await fetch(`/api/raw-data?table=${encodeURIComponent(tableName)}`);
  if (!response.ok) throw new Error("Failed to fetch table data");
  return response.json();
}

async function runReadonlyQuery(query: string) {
  const response = await fetch("/api/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Failed to run query");
  }

  return data.rows || [];
}

type DataRow = Record<string, unknown>;

function DataTable(props: { rows: DataRow[] }) {
  return (
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <Show when={props.rows.length > 0}>
              <For each={Object.keys(props.rows[0] || {})}>
                {(header) => (
                  <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                )}
              </For>
            </Show>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <For each={props.rows}>
            {(row) => (
              <tr>
                <For each={Object.values(row)}>
                  {(cell) => (
                    <td class="px-3 py-2 whitespace-nowrap text-gray-900">{String(cell)}</td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={props.rows.length === 0}>
        <div class="p-4 text-gray-500 italic">No data found.</div>
      </Show>
    </div>
  );
}

export default function RawDataViewer() {
  const [isClient, setIsClient] = createSignal(false);
  const [tables] = createResource(
    () => isClient(),
    async (ready) => (ready ? fetchTables() : []),
  );
  const [selectedTable, setSelectedTable] = createSignal("");
  const [tableData] = createResource(
    () => (isClient() ? selectedTable() : ""),
    fetchTableData,
  );
  const [query, setQuery] = createSignal("SELECT * FROM session LIMIT 100");
  const [queryResult, setQueryResult] = createSignal<DataRow[]>([]);
  const [queryError, setQueryError] = createSignal("");
  const [queryLoading, setQueryLoading] = createSignal(false);

  const handleRunQuery = async () => {
    setQueryError("");
    setQueryLoading(true);
    try {
      const rows = await runReadonlyQuery(query());
      setQueryResult(rows as DataRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run query";
      setQueryError(message);
      setQueryResult([]);
    } finally {
      setQueryLoading(false);
    }
  };

  onMount(() => {
    setIsClient(true);
  });

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">Raw Data Viewer</h1>

      <Card>
        <h2 class="font-semibold mb-2">Raw SQL (Read-Only)</h2>
        <p class="text-sm text-gray-600 mb-3">Only SELECT queries are allowed.</p>
        <textarea
          class="w-full min-h-[120px] rounded border border-gray-300 p-3 font-mono text-sm"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={queryLoading()}
            onClick={() => {
              void handleRunQuery();
            }}
          >
            {queryLoading() ? "Running..." : "Run Query"}
          </button>
          <Show when={queryError()}>
            <span class="text-sm text-red-600">{queryError()}</span>
          </Show>
        </div>
        <Show when={!queryLoading() && !queryError()}>
          <div class="mt-4">
            <DataTable rows={queryResult()} />
          </div>
        </Show>
      </Card>

      <div class="flex space-x-4">
        <Card class="w-1/4">
          <h2 class="font-semibold mb-2">Tables</h2>
          <Show when={!tables.loading} fallback={<div>Loading tables...</div>}>
            <Show when={!tables.error} fallback={<div class="text-red-500">{tables.error.message}</div>}>
              <ul class="space-y-1">
                <For each={tables()}>
                  {(t: any) => (
                    <li>
                      <button
                        type="button"
                        class={`w-full text-left px-2 py-1 rounded ${selectedTable() === t.name ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"}`}
                        onClick={() => setSelectedTable(t.name)}
                      >
                        {t.name}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </Card>

        <Card class="flex-1 overflow-auto">
          <Show when={selectedTable()} fallback={<div class="text-gray-500 italic">Select a table to view data</div>}>
            <h2 class="font-semibold mb-2">Data: {selectedTable()}</h2>
            <Show when={!tableData.loading} fallback={<div>Loading data...</div>}>
              <Show when={!tableData.error} fallback={<div class="text-red-500">{tableData.error.message}</div>}>
                <DataTable rows={(tableData() || []) as DataRow[]} />
              </Show>
            </Show>
          </Show>
        </Card>
      </div>
    </div>
  );
}
