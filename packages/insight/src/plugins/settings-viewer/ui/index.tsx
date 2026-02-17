import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { Card } from "~/core/ui-kit";

async function fetchSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
}

type Token = {
  text: string;
  className?: string;
};

function tokenizeJson(source: string): Token[] {
  const text = source ?? "";
  const pattern = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"\s*:|"(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, index) });
    }

    const value = match[0];
    let className = "text-amber-500";

    if (/^".*":$/.test(value)) {
      className = "text-sky-500";
    } else if (/^"/.test(value)) {
      className = "text-emerald-500";
    } else if (value === "true" || value === "false") {
      className = "text-violet-500";
    } else if (value === "null") {
      className = "text-zinc-500";
    }

    tokens.push({ text: value, className });
    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }

  return tokens;
}

export default function SettingsViewer() {
  const [isClient, setIsClient] = createSignal(false);
  const [settings] = createResource(
    () => isClient(),
    async (ready) => (ready ? fetchSettings() : { content: "" }),
  );
  const [isDark, setIsDark] = createSignal(true);

  onMount(() => {
    setIsClient(true);
  });

  return (
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Settings</h1>
        <button 
          type="button"
          onClick={() => setIsDark(!isDark())}
          class={`px-3 py-1 rounded text-sm transition-colors ${isDark() ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
        >
          {isDark() ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <Card>
        <Show when={!settings.loading} fallback={<div class="p-4">Loading settings...</div>}>
          <Show when={!settings.error} fallback={<div class="p-4 text-red-500">Failed to load settings: {settings.error?.message}</div>}>
            <pre class={`p-4 rounded overflow-auto transition-colors duration-200 ${isDark() ? "bg-gray-900 text-zinc-100" : "bg-zinc-50 text-zinc-900 border border-zinc-200"}`}>
              <code class="whitespace-pre-wrap break-words">
                <For each={tokenizeJson(settings()?.content || "")}> 
                  {(token) => (
                    <Show when={token.className} fallback={<>{token.text}</>}>
                      <span class={token.className}>{token.text}</span>
                    </Show>
                  )}
                </For>
              </code>
            </pre>
          </Show>
        </Show>
      </Card>
    </div>
  );
}
