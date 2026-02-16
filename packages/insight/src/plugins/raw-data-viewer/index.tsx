import { createEffect, createResource, createSignal, For, Show } from "solid-js";
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

export default function RawDataViewer() {
  const [tables] = createResource(fetchTables);
  const [selectedTable, setSelectedTable] = createSignal("");
  const [tableData] = createResource(selectedTable, fetchTableData);

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">Raw Data Viewer</h1>

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
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <Show when={tableData() && tableData().length > 0}>
                          <For each={Object.keys(tableData()[0])}>
                            {(header) => (
                              <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                            )}
                          </For>
                        </Show>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <For each={tableData()}>
                        {(row: any) => (
                          <tr>
                            <For each={Object.values(row)}>
                              {(cell: any) => (
                                <td class="px-3 py-2 whitespace-nowrap text-gray-900">{String(cell)}</td>
                              )}
                            </For>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                  <Show when={tableData() && tableData().length === 0}>
                    <div class="p-4 text-gray-500 italic">No data found in table.</div>
                  </Show>
                </div>
              </Show>
            </Show>
          </Show>
        </Card>
      </div>
    </div>
  );
}
