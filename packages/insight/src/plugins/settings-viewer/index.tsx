import { createResource, Show } from "solid-js";
import { Card } from "~/mocks/ui";

async function fetchSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
}

export default function SettingsViewer() {
  const [settings] = createResource(fetchSettings);

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">Settings</h1>
      <Card>
        <Show when={!settings.loading} fallback={<div class="p-4">Loading settings...</div>}>
          <pre class="bg-gray-800 text-white p-4 rounded overflow-auto">
            <code>{settings().content}</code>
          </pre>
        </Show>
      </Card>
    </div>
  );
}
