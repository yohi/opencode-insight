Config Loader Implementation: Created packages/insight/src/core/config.server.ts with loadConfig function supporting jsonc and hierarchical lookup.

Plugin Loader Server: Added config-aware external plugin loading with allowlist/denylist filtering, dynamic `import(/* @vite-ignore */)` fallback (`/server` then package root), runtime validation, and local-plugin ID conflict precedence.

External Plugin Verification: Added root `verify-plugins.ts` that performs a real package import test by creating `node_modules/opencode-plugin-dummy`, temporarily injecting dependency into CWD `package.json`, asserting `discoverExternalPlugins()` + dynamic import success, then always restoring `package.json` and removing dummy files in `finally`.

Runtime Constraint: `loadPlugins()` cannot be directly validated in plain Bun runtime because `import.meta.glob` is Vite-specific in this context, so verification targets external discovery/import path directly.
