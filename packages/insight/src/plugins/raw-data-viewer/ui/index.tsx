import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { Card } from "~/ui/card";
import { Badge } from "~/ui/badge";

// --- API Functions ---

async function fetchTables() {
  const response = await fetch("/api/raw-data/tables");
  if (!response.ok) throw new Error("Failed to fetch tables");
  const data = await response.json();

  if (Array.isArray(data)) {
    return data.map((item: any) => (typeof item === 'string' ? item : item.name));
  }
  if (data.tables && Array.isArray(data.tables)) {
    return data.tables.map((item: any) => (typeof item === 'string' ? item : item.name));
  }

  throw new Error("Invalid response format for tables");
}

async function runReadonlyQuery(query: string) {
  const response = await fetch("/api/raw-data/query", {
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

// --- Components ---

function DataTable(props: { rows: DataRow[] }) {
  return (
    <div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
      <table class="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
        <thead class="bg-neutral-50 dark:bg-neutral-800">
          <tr>
            <Show when={props.rows.length > 0}>
              <For each={Object.keys(props.rows[0] || {})}>
                {(header) => (
                  <th class="px-4 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-xs">
                    {header}
                  </th>
                )}
              </For>
            </Show>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
          <For each={props.rows}>
            {(row) => (
              <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <For each={Object.values(row)}>
                  {(cell) => (
                    <td class="px-4 py-2 whitespace-nowrap text-neutral-900 dark:text-neutral-200 font-mono text-xs">
                      {cell === null ? <span class="text-neutral-400">NULL</span> : String(cell)}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={props.rows.length === 0}>
        <div class="p-8 text-center text-neutral-500 dark:text-neutral-400 italic">
          No data found.
        </div>
      </Show>
    </div>
  );
}

export default function RawDataViewer() {
  const [isClient, setIsClient] = createSignal(false);
  const [tables] = createResource(
    isClient,
    async (ready) => (ready ? fetchTables() : []),
  );

  const [query, setQuery] = createSignal("SELECT * FROM session LIMIT 100");
  const [queryResult, setQueryResult] = createSignal<DataRow[]>([]);
  const [queryError, setQueryError] = createSignal("");
  const [queryLoading, setQueryLoading] = createSignal(false);
  const [selectedTable, setSelectedTable] = createSignal<string | null>(null);

  const handleRunQuery = async (sql?: string) => {
    const queryToRun = sql || query();
    setQueryError("");
    setQueryLoading(true);
    // If sql was passed (e.g. from table click), update the input
    if (sql) setQuery(sql);

    try {
      const rows = await runReadonlyQuery(queryToRun);
      setQueryResult(rows as DataRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run query";
      setQueryError(message);
      setQueryResult([]);
    } finally {
      setQueryLoading(false);
    }
  };

  const onTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
    const sql = `SELECT * FROM ${escapedTableName} LIMIT 100`;
    handleRunQuery(sql);
  };

  onMount(() => {
    setIsClient(true);
  });

  return (
    <div class="h-[calc(100vh-6rem)] flex gap-4 p-4">
      {/* Sidebar: Table List */}
      <Card class="w-64 flex flex-col overflow-hidden p-0!">
        <div class="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          <h2 class="font-semibold text-neutral-800 dark:text-neutral-200">Tables</h2>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <Show when={!tables.loading} fallback={<div class="p-4 text-sm text-neutral-500">Loading tables...</div>}>
            <Show when={!tables.error} fallback={<div class="p-4 text-sm text-red-500">Failed to load tables</div>}>
              <ul class="space-y-1">
                <For each={tables()}>
                  {(table: string) => (
                    <li>
                      <button
                        type="button"
                        onClick={() => onTableClick(table)}
                        class={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedTable() === table
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                      >
                        {table}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>
      </Card>

      {/* Main Content: Query & Results */}
      <div class="flex-1 flex flex-col gap-4 min-w-0">
        <Card class="flex-none p-4">
          <div class="flex justify-between items-center mb-2">
            <h2 class="font-semibold text-neutral-800 dark:text-neutral-200">Raw SQL Query</h2>
            <Badge variant="warning">Read-Only</Badge>
          </div>
          <div class="relative">
            <textarea
              class="w-full h-32 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="SELECT * FROM table LIMIT 10"
            />
            <div class="absolute bottom-3 right-3">
              <button
                type="button"
                disabled={queryLoading()}
                onClick={() => handleRunQuery()}
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Show when={queryLoading()} fallback="Run Query">
                  <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Running...
                </Show>
              </button>
            </div>
          </div>
          <Show when={queryError()}>
            <div class="mt-3">
              <Badge variant="error" class="w-full flex justify-center p-2">
                {queryError()}
              </Badge>
            </div>
          </Show>
        </Card>

        <Card class="flex-1 overflow-hidden flex flex-col min-h-0 !p-0">
          <div class="flex-none p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center">
            <h2 class="font-semibold text-neutral-800 dark:text-neutral-200">Results</h2>
            <Show when={queryResult().length > 0}>
              <span class="text-xs text-neutral-500 font-mono">{queryResult().length} rows</span>
            </Show>
          </div>
          <div class="flex-1 overflow-auto p-4">
            <DataTable rows={queryResult()} />
          </div>
        </Card>
      </div>
    </div>
  );
}
