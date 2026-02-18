import { createResource, Show, Suspense, ErrorBoundary } from "solid-js";
import { Card } from "~/ui/card";
import { CodeBlock } from "~/ui/code-block";
import { Badge } from "~/ui/badge";

type SettingsResponse = {
  content: string;
  path: string | null;
  found: boolean;
};

async function fetchSettings(): Promise<SettingsResponse> {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.statusText}`);
  }
  return response.json();
}

export default function SettingsViewer() {
  const [data, { refetch }] = createResource(fetchSettings);

  return (
    <div class="space-y-6">
      <ErrorBoundary
        fallback={(err, reset) => (
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Settings Viewer
              </h2>
              <Badge variant="error">Error</Badge>
            </div>
            <Card class="border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-200 p-4">
              <div class="font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                Error loading settings
              </div>
              <div class="text-sm opacity-90 mt-2 pl-7">{err.toString()}</div>
              <button
                onClick={() => {
                  refetch();
                  reset();
                }}
                class="mt-4 ml-7 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </Card>
          </div>
        )}
      >
        <Suspense
          fallback={
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Settings Viewer
                </h2>
                <Badge variant="warning">Loading...</Badge>
              </div>
              <div class="animate-pulse space-y-4">
                <div class="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3"></div>
                <div class="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
              </div>
            </div>
          }
        >
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Settings Viewer
            </h2>
            <Show when={data()}>
              {(settings) => (
                <Badge variant={settings().found ? "success" : "error"}>
                  {settings().found ? "Loaded" : "Not Found"}
                </Badge>
              )}
            </Show>
          </div>

          <Show when={data()}>
            {(settings) => (
              <>
                <Show when={!settings().found}>
                  <Card class="border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-200 p-4">
                    <div class="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
                      <div>
                        <div class="font-medium">Configuration Not Found</div>
                        <p class="mt-1 text-sm opacity-90">
                          Could not locate <code>opencode.jsonc</code> in the search paths.
                          Please ensure the file exists in your project root.
                        </p>
                      </div>
                    </div>
                  </Card>
                </Show>

                <Show when={settings().found}>
                  <div class="space-y-4">
                    <Show when={settings().path}>
                      <div class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>
                        <span class="font-medium">Path:</span>
                        <code class="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                          {settings().path}
                        </code>
                      </div>
                    </Show>

                    <Card class="p-0 overflow-hidden border-neutral-200 dark:border-neutral-800">
                      <CodeBlock
                        code={settings().content}
                        class="border-0 rounded-none bg-transparent"
                      />
                    </Card>
                  </div>
                </Show>
              </>
            )}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
