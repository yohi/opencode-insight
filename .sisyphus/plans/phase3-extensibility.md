# Phase 3: Extensibility Implementation

## TL;DR

> **Quick Summary**: Enable dynamic loading of external plugins (`opencode-plugin-*`) from `package.json` dependencies, controllable via `opencode.jsonc`.
> 
> **Deliverables**:
> - Enhanced `plugin-loader.server.ts` capable of discovering and importing external packages.
> - Configuration logic to whitelist/enable external plugins.
> - Runtime validation (duck typing) for loaded plugins.
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Discovery Logic -> Import Mechanism -> Integration

---

## Context

### Original Request
Implement Phase 3 features: Extensibility & External Plugin Loading.

### Metis Analysis
**Key Findings**:
- **Current State**: Only loads local plugins (`src/plugins/*`).
- **Target**: Load `opencode-plugin-*` from `node_modules` (SSR runtime import).
- **Risks**:
  - Client-side dynamic import is fragile/impossible without build-time injection.
  - SSR dynamic import needs `/* @vite-ignore */` and `ssr.external` configuration.
  - Security risk of arbitrary code execution (mitigated by discovery + allowlist).

### Phase 3 Objectives
1.  **Discovery**: Scan `package.json` for `opencode-plugin-*`.
2.  **Control**: Filter plugins based on `opencode.jsonc` (enabled list).
3.  **Loading**: Dynamically import server-side entry points.
4.  **Validation**: Ensure plugins export the correct interface.

**Scope Constraint**: Focus on **Server-Side Plugin Loading** first. Client-side UI injection (routes/sidebar) requires complex build-time virtual module generation, which is out of scope for this "Simple Extensibility" phase unless trivial. We will assume external plugins primarily extend backend API/Watcher logic for now, or use a simplified client injection if feasible.

---

## Work Objectives

### Concrete Deliverables
- `src/core/plugin-loader.server.ts`: Logic to scan `package.json` and import modules.
- `src/core/config.server.ts` (new): Logic to read `opencode.jsonc` for plugin config.
- `vite.config.ts`: Update `ssr.external` if needed.

### Definition of Done
- [ ] Server detects `opencode-plugin-*` dependencies.
- [ ] Server respects `opencode.jsonc` enabled/disabled settings.
- [ ] Valid plugins are registered and their APIs are accessible.
- [ ] Invalid plugins are skipped with a warning.

### Guardrails
- **Naming Convention**: STRICTLY `opencode-plugin-[a-z0-9-]+`.
- **Validation**: Runtime check for `id` and `name`.
- **Error Handling**: Plugin failure must NOT crash the main server.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure**: `bun test`.
- **Method**: Unit tests for discovery/validation logic. Integration test by mocking `package.json` reading.

### QA Policy

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| Plugin Discovery | `bun test` | Mock `package.json` and verify parser output. |
| Config Loading | `bun test` | Mock `opencode.jsonc` and verify filtering. |
| Dynamic Import | Manual/Script | Create a dummy local package in `node_modules` and verify load (simulated). |

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Core Logic):
├── Task 1: Config Loader Implementation [quick]
├── Task 2: Plugin Discovery Logic [quick]
└── Task 3: Plugin Interface Validator [quick]

Wave 2 (Integration):
├── Task 4: Dynamic Import Implementation (Server) [deep]
└── Task 5: Vite Config Updates (SSR External) [quick]

Wave FINAL (Verification):
├── Task F1: Dummy Plugin Load Test [deep]
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 4 | 1 |
| 2 | — | 4 | 1 |
| 3 | — | 4 | 1 |
| 4 | 1, 2, 3 | F1 | 2 |
| 5 | — | F1 | 2 |
| F1 | 4, 5 | — | FINAL |

---

## TODOs

- [x] 1. **Config Loader Implementation**
- [x] 2. **Plugin Discovery Logic**
- [x] 3. **Plugin Interface Validator**

  **What to do**:
  - Create `packages/insight/src/core/plugin-validator.ts` (shared or server-local).
  - Implement `validatePlugin(module: any): boolean`.
  - Check for `id` (string), `name` (string).
  - Check `api` is object if present.
  - Return true/false and log errors.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `typescript`

  **Parallelization**:
  - **Group**: Wave 1

- [x] 4. **Dynamic Import Implementation (Server)**
  > Implemented: `loadPlugins()` in `plugin-loader.server.ts`, supporting async import and `opencode.jsonc` filtering.

  **What to do**:
  - Modify `packages/insight/src/core/plugin-loader.server.ts`.
  - Update `loadPlugins()` to:
    1. Call `discoverExternalPlugins()`.
    2. Call `loadConfig()` and filter list.
    3. Iterate and `import()` packages.
       - Use `/* @vite-ignore */` comment.
       - Try `import(pkg + "/server")` first, fallback to `import(pkg)` if needed (or stick to strict `/server` convention).
    4. Validate loaded module.
    5. Merge with local plugins (Local takes precedence if ID conflict? Or Error? -> **Error on ID conflict**).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `node`

  **Parallelization**:
  - **Group**: Wave 2
  - **Depends On**: Task 1, 2, 3

- [x] 5. **Vite Config Updates**
  > Implemented: `ssr: { noExternal: [...] }` in `vite.config.ts`.

  **What to do**:
  - Modify `packages/insight/vite.config.ts`.
  - Update `ssr: { external: [...] }`.
  - Add logic to exclude `opencode-plugin-*` from bundling (so they are treated as external require/imports in SSR).
  - This ensures `import()` works at runtime in Node/Bun.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Group**: Wave 2

---

## Final Verification Wave

- [x] F1. **Dummy Plugin Load Test**
  - Create a temporary directory `node_modules/opencode-plugin-dummy-test`.
  - Create `package.json` and `server.js` exporting a valid plugin.
  - Run a script that invokes `loadPlugins()` and asserts the dummy plugin is present.
  - Clean up `node_modules`.

---

## Commit Strategy
- Commit after each Task completion.
- Message format: `feat(insight): [phase3] description`
