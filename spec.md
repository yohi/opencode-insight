# OpenCode Insight Specification

## 1. Project Overview

**OpenCode Insight** is a local web-based graphical user interface for visualizing and monitoring OpenCode activities. It acts as a companion tool for the CLI, providing real-time insights into sessions, agent thought processes, and configurations.

### Core Philosophy

* **Local-First**: Runs locally on the user's machine via `opencode insight`.
* **Real-Time**: Reflects state changes (database updates, agent logs) instantly via WebSocket.
* **Extensible**: Built on a modular architecture where core features are treated as plugins, allowing third-party extensions.
* **Monorepo Native**: Fully integrated into the existing OpenCode monorepo structure, reusing UI components and database schemas.

## 2. Tech Stack

| Category | Technology | Version / Note |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | v1.2+ (Monorepo standard) |
| **Framework** | **SolidStart** | SSR, API Routes, File-based routing |
| **Language** | **TypeScript** | Strict mode |
| **Styling** | **Tailwind CSS** | Reuse @opencode-ai/ui/styles/tailwind |
| **Database** | **SQLite (Raw Mode)** | Direct read-only access for raw data visualization (opencode.db) |
| **ORM** | **Drizzle ORM** | Reuse schemas from packages/console/core |
| **Realtime** | **WebSocket** | Bun.serve({ websocket }) |
| **State** | **SolidJS Signals** | Stores for reactive UI updates |

## 3. Architecture

### 3.1 Directory Structure

New package: `packages/insight`

```text
packages/insight/  
├── src/  
│   ├── app.tsx                 # Entry point  
│   ├── entry-client.tsx  
│   ├── entry-server.tsx  
│   ├── core/  
│   │   ├── plugin-loader.ts    # Dynamic plugin discovery & loading  
│   │   ├── bus.ts              # Internal event bus  
│   │   └── db.ts               # Drizzle client (Read-Only)  
│   ├── server/  
│   │   ├── ws.ts               # WebSocket server handler  
│   │   └── watcher.ts          # File watcher for DB/Logs  
│   ├── ui/                     # Dashboard shell layout  
│   │   ├── sidebar.tsx  
│   │   └── layout.tsx  
│   └── plugins/                # Built-in plugins (Core features)  
│       ├── session-viewer/     # Session explorer  
│       ├── agent-monitor/      # Real-time agent debugger  
│       ├── settings-viewer/    # Config viewer  
│       └── raw-data-viewer/    # Raw Database Table Explorer  
├── public/  
├── tsconfig.json  
└── package.json
```

### 3.2 Plugin System (Architecture Level 2)

The dashboard core is a "Shell" that loads plugins. Even standard features (Sessions, Settings) are implemented as internal plugins.

**Plugin Interface:**

Each plugin must export a definition object:

```typescript
export interface InsightPlugin {  
  id: string;  
  name: string;  
  icon?: string; // Icon name from @opencode-ai/ui  
    
  // UI Injection  
  routes?: RouteDefinition[]; // e.g., /sessions, /sessions/:id  
  sidebarItems?: SidebarItem[]; // Menu entries  
    
  // Backend Injection (Server-side)  
  api?: {  
    [endpoint: string]: (ctx: APIContext) => Promise<Response>;  
  };  
  onLoad?: (ctx: ServerContext) => void | Promise<void>;  
}
```

**Loading Mechanism:**

1. **Discovery**: Scan `package.json` dependencies for `opencode-plugin-*` and local `src/plugins/*`.
2. **Registration**: Register routes and API endpoints at boot time.
3. **Injection**: Render sidebar items and routes dynamically.

### 3.3 Data Flow & Real-Time Updates

Since the Insight tool might run in a separate process from the main OpenCode CLI/Server:

1. **Source of Truth**: `~/.local/share/opencode/opencode.db` (SQLite WAL mode).
2. **Watcher**: `packages/insight/src/server/watcher.ts` watches the DB file for changes using `fs.watch`.
3. **Trigger**: On file change, the server debounces the event and queries the DB for the latest relevant data (e.g., last 10 messages).
4. **Push**: Updates are broadcasted via WebSocket to the SolidJS client.
5. **Render**: `createResource` or `createStore` in SolidJS updates the DOM.

## 4. Features & Requirements

### 4.1 Insight Shell (Must Have)

* **Sidebar**: Navigation menu generated from loaded plugins.
* **Status Bar**: Connection status (WebSocket), Current Workspace path.
* **Theme**: Dark/Light mode support (sync with system or `opencode.jsonc`).

### 4.2 Session Viewer Plugin (Must Have)

* **List View**:
    * Paginated list of sessions from `SessionTable`.
    * Sort by `time_updated` (desc).
    * Status indicators (Active, Completed, Error).
* **Detail View**:
    * Chat interface style (Read-only).
    * Render Markdown/Code blocks properly.
    * User vs Assistant message distinction.

### 4.3 Agent Monitor Plugin (Should Have)

* **Real-time Stream**: Visualize the "Thinking" process or internal logs if available in DB/Files.
* **State Visualization**: Show current "Mode" (Plan vs Build) and active "Tools".

### 4.4 Settings Viewer Plugin (Must Have)

* **Config View**: Display the contents of `opencode.jsonc`.
* **Read-Only**: Render as a syntax-highlighted code block or a read-only form.

### 4.5 Raw Data Viewer Plugin (Nice to Have)

* **Table Explorer**: View raw rows from `opencode.db` tables (sqlite-web style).
* **Raw SQL**: Ability to execute read-only SQL queries for debugging.

## 5. Data Structure

Reuse existing schemas from `packages/console/core`.

**Key Tables to Observe:**

* session (ID, Title, CreatedAt)
* message (SessionID, Content, Role, Timestamp)
* usage (Token usage stats - Nice to have)

**New Types (Dashboard Specific):**

```typescript
type WebSocketMessage =   
  | { type: 'INIT', payload: PluginState[] }  
  | { type: 'UPDATE_SESSION', sessionId: string, data: Message[] }  
  | { type: 'AGENT_LOG', log: string };
```
