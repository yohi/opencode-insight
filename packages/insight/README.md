# OpenCode Insight

A local web-based graphical user interface for visualizing and monitoring OpenCode activities.

## Setup

1.  Install dependencies:
    ```bash
    bun install
    ```

2.  Seed the database (optional, for development):
    ```bash
    bun run seed
    ```

## Development

You need to run two processes:

1.  **WebSocket Server & Watcher** (Backend):
    ```bash
    bun run start:server
    ```
    This listens on port 3001.

2.  **Frontend**:
    ```bash
    bun run dev
    ```
    This runs the SolidStart dev server (typically on port 3000 or 5173).

## Architecture

*   `src/server/index.ts`: The backend process. It handles WebSocket connections (port 3001) and watches the SQLite database for changes.
*   `src/entry-server.tsx`: The SolidStart SSR entry point.
*   `src/core/store.ts`: The frontend state store that connects to the WebSocket server.
*   `src/plugins/`: Contains the UI components for different features (Sessions, Agent Monitor, etc.).
*   `src/mocks/`: Contains mock UI components and schemas until the monorepo packages are available.

## Database

The application reads from `opencode.db` in the project root by default (or set `DB_PATH` env var).
It uses SQLite in WAL mode for better concurrency.

## Docker Development

This project supports development using **Devcontainer** (VS Code) or Docker Compose.

### Devcontainer (Recommended)
1. Open the project in VS Code.
2. Click "Reopen in Container" when prompted (or use Command Palette).
3. The environment will be set up automatically.
4. Run `bun run dev` and `bun run start:server` in the integrated terminal.

### Production Build
To build and run the production container:

```bash
docker compose up -d --build
```
The application will be available at `http://localhost:3000`.

