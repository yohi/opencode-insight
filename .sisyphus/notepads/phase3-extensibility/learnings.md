# Phase 3 Extensibility - Implementation Learnings

## Config Loader Implementation

- **Source**: `packages/insight/src/core/config.server.ts`
- **Function**: `loadConfig()`
- **Supports**: `jsonc` (comments allowed) and hierarchical lookup files (Env -> Cwd -> Global).
- **Configuration Keys**:
  - `plugins.enabled`: Array of package names to explicitly allow.
  - `plugins.disabled`: Array of package names to explicitly disable.
- **Example**:
  ```jsonc
  {
    "plugins": {
      "enabled": ["opencode-plugin-foo"],
      "disabled": ["opencode-plugin-bar"]
    }
  }
  ```

## Plugin Loader Server

- **Config-aware external plugin loading**: Respects the allowlist (`enabled`) and denylist (`disabled`) from `opencode.jsonc`.
- **Dynamic import fallback**:
  - Uses `/* @vite-ignore */` to bypass static analysis warnings.
  - Search order:
    1. `import(`${pkg}/server`)`
    2. `import(pkg)` (fallback)
- **Runtime validation**: Validates shape (must have `id`, `name`) via internal `validatePlugin` helper.
- **Local-plugin ID conflict precedence**: usage of local plugins from `src/plugins/*` always overrides external plugins with the same `id`.

## External Plugin Verification

- **Purpose**: Verify that `plugin-loader.server.ts` can dynamically discover and import a package from `node_modules`.
- **Key File**: `verify-plugins.ts`
- **Process**:
  1.  **Setup**: Create `node_modules/opencode-plugin-dummy` with a valid `package.json` and `server.js`.
  2.  **Inject**: Modify root `package.json` to include `opencode-plugin-dummy` in dependencies.
  3.  **Verify**:
      - Call `discoverExternalPlugins()` to ensure it lists the dummy plugin.
      - Call `loadPlugins()` (or internal loader) and assert the plugin is loaded.
  4.  **Cleanup (`finally`)**:
      - Restore original `package.json`.
      - Delete `node_modules/opencode-plugin-dummy`.

## Runtime Constraints

- **Vite Specifics**: `import.meta.glob` works only during Vite build/dev, not in plain `bun test`.
- **Testing Strategy**: Tests verify the *external* discovery and import path directly, mocking the glob part or running in an environment where Vite transforms apply.
