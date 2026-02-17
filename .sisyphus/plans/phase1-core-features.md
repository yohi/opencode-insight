# Phase 1: Core Features Implementation

## TL;DR

> **Quick Summary**: Implement the three core plugins (Session Viewer, Settings Viewer, Raw Data Viewer) to a functional, robust state, filling in the current skeletons.
> 
> **Deliverables**:
> - Fully functional **Session Detail View** with Markdown & Code highlighting.
> - **Settings Viewer** with hierarchical config loading (Env -> Cwd -> Global).
> - **Raw Data Viewer** with table explorer and safe SQL execution (read-only).
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Shared UI Components -> Feature Plugins -> Integration

---

## Context

### Original Request
Implement Phase 1 of the OpenCode Insight specification, focusing on the "Must Have" core features to bridge the gap between spec and current skeleton implementation.

### Interview Summary
**Key Discussions**:
- **Scope**: Focus on core features (Session, Settings, Raw Data). Real-time/streaming is Phase 2.
- **Settings Location**: Adopting a hierarchical search strategy (`OPENCODE_CONFIG_PATH` -> `cwd` -> `~/.config/opencode/`).
- **DB Location**: Adopting a hierarchical search strategy (`DB_PATH` -> `cwd` -> `~/.local/share/opencode/`).
- **Safety**: Raw Data Viewer restricted to `SELECT` only, max 100 rows.

### Metis Review
**Identified Gaps** (addressed):
- **Missing File Handling**: Settings API must return 200 with "not found" message, not 500 error.
- **Large Data**: Raw Data Viewer capped at 100 rows to prevent UI freeze.
- **Security**: SQL execution strictly read-only.
- **Scope Creep**: Session Viewer is **static** for Phase 1. No WebSocket streaming yet.

---

## Work Objectives

### Core Objective
Transform the placeholder plugins into fully functional tools for monitoring OpenCode state.

### Concrete Deliverables
- `src/plugins/session-viewer/ui/detail.tsx`: Full message history rendering.
- `src/plugins/settings-viewer/api.ts` & `ui/index.tsx`: Config file reader & display.
- `src/plugins/raw-data-viewer/api.ts` & `ui/index.tsx`: Database table explorer.

### Definition of Done
- [ ] Session details render correctly with user/assistant distinction.
- [ ] Settings viewer shows content of `opencode.jsonc` or graceful error.
- [ ] Raw Data viewer lists tables and shows data rows (max 100).
- [ ] All features work without crashing on missing files/data.

### Must Have
- **Markdown Rendering**: Messages must be readable.
- **Read-Only Safety**: No ability to modify data or config.
- **Error Resilience**: UI handles missing DB/Config gracefully.

### Must NOT Have (Guardrails)
- **Real-time Streaming**: No WebSocket subscription logic in Phase 1 (static fetch only).
- **Write Operations**: No `INSERT/UPDATE/DELETE` in Raw Data Viewer.
- **Pagination**: No complex pagination logic (simple `LIMIT 100` is sufficient).

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: No (SolidStart project, but no test runner setup yet).
- **Automated tests**: **Tests-after**. We will rely on `bun test` if applicable, but primarily **Agent-Executed QA Scenarios** using `curl` and `grep` for API, and `playwright` (simulated via manual verification steps if playwright not configured, but ideally automated).
- **QA Policy**: Every task MUST include agent-executed QA scenarios.

### QA Policy
| Deliverable Type | Verification Tool | Method |
| :--- | :--- | :--- |
| API/Backend | Bash (curl + jq) | Request endpoints, validate JSON structure & status codes. |
| Frontend/UI | Manual/Visual (Agent) | Since Playwright isn't fully set up, Agent will verify via API response (SSR) and check for critical HTML elements via `curl` or `grep`. |

---


## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Foundation & Backend Logic):
├── Task 1: Shared UI Components (Card, Badge, CodeBlock) [visual-engineering]
├── Task 2: Settings Viewer API & Logic (Hierarchical Loading) [quick]
├── Task 3: Raw Data Viewer API (Safe SQL Executor) [deep]
└── Task 4: Session Viewer API (Detail Fetching) [quick]

Wave 2 (UI Implementation & Integration):
├── Task 5: Settings Viewer UI (ReadOnly Display) [visual-engineering]
├── Task 6: Raw Data Viewer UI (Table Explorer) [visual-engineering]
└── Task 7: Session Viewer Detail UI (Markdown & Styling) [visual-engineering]

Wave FINAL (Verification):
├── Task F1: API Compliance Check [quick]
└── Task F2: Scope Fidelity Check [deep]
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 5, 6, 7 | 1 |
| 2 | — | 5 | 1 |
| 3 | — | 6 | 1 |
| 4 | — | 7 | 1 |
| 5 | 1, 2 | F1 | 2 |
| 6 | 1, 3 | F1 | 2 |
| 7 | 1, 4 | F1 | 2 |
| F1 | 5, 6, 7 | — | FINAL |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|------|------------|----------------------|
| 1 | **4** | T1 → `visual-engineering`, T2 → `quick`, T3 → `deep`, T4 → `quick` |
| 2 | **3** | T5 → `visual-engineering`, T6 → `visual-engineering`, T7 → `visual-engineering` |
| FINAL | **2** | F1 → `quick`, F2 → `deep` |

---

## TODOs

- [x] 1. **Shared UI Components**
- [x] 2. **Settings Viewer API (Backend)**
- [x] 3. **Raw Data Viewer API (Backend)**
- [x] 4. **Session Viewer API (Backend)**

  **What to do**:
  - Ensure `src/plugins/session-viewer/api.ts` exists and works.
  - GET `/api/sessions/:id`: Return full session details with messages and usage.
  - Ensure messages are sorted by timestamp ASC.

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7

  **QA Scenarios**:
  ```bash
  Scenario: Fetch Session Detail
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3000/api/sessions/latest (if implemented) or specific ID.
    Expected Result: JSON with 'messages' array.
  ```

- [x] 5. **Settings Viewer UI**
- [x] 6. **Raw Data Viewer UI**
- [x] 7. **Session Viewer Detail UI**

  **What to do**:
  - Implement `src/plugins/session-viewer/ui/detail.tsx`.
  - Fetch session data using `createResource`.
  - Render message list.
  - Use `solid-markdown` to render `message.content`.
  - Style `user` messages (right align, blue bg?) and `assistant` messages (left align, gray bg).
  - Show `usage` stats if available.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Depends On**: Task 1, 4

  **QA Scenarios**:
  ```bash
  Scenario: Check Session Detail UI
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3000/sessions/123
    Expected Result: HTML contains message container.
  ```

---

## Final Verification Wave

- [ ] F1. **API Compliance Check**
  - Verify all endpoints (`/api/settings`, `/api/raw-data/*`, `/api/sessions/*`) return correct JSON structures.
  - Verify error handling (400/404).

- [ ] F2. **Scope Fidelity Check**
  - Verify NO WebSocket streaming logic was added to the UI (Phase 1 restriction).
  - Verify NO write capabilities in SQL executor.

---

## Commit Strategy
- Commit after each Task completion.
- Message format: `feat(insight): implement [feature name]`
