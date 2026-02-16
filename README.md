# OpenCode Insight

OpenCode Insight is a developer tool for visualizing and monitoring the activities of OpenCode agents in real-time. It provides a web-based GUI to inspect tasks, logs, and system metrics.

## Quick Start

This project is a monorepo. The main application is located in `packages/insight`.

### Prerequisites

- [Bun](https://bun.sh) (v1.0.0 or later)

### Installation

```bash
cd packages/insight
bun install
```

### Running the Application

You need to run two processes for development:

1.  **Backend Server** (WebSocket & File Watcher)
    ```bash
    # In packages/insight
    bun run start:server
    ```

2.  **Frontend Interface**
    ```bash
    # In a separate terminal, inside packages/insight
    bun run dev
    ```

Open your browser at `http://localhost:3000` (or the port shown in the terminal).

### Running with Docker

This project supports **Devcontainer**. Open in VS Code and select "Reopen in Container" for a configured environment.

Alternatively, you can run the production build with Docker Compose:
```bash
cd packages/insight
docker compose up -d --build
```

## Project Structure

- `packages/insight`: The core application (SolidStart + Tailwind CSS + WebSocket Server).
- `specs/`: Project specifications and documentation (SDD).
- `AGENTS.md`: Guidelines for AI agents working on this codebase.

## Documentation

- See [packages/insight/README.md](./packages/insight/README.md) for detailed application documentation.
- See [AGENTS.md](./AGENTS.md) for contribution guidelines and agent instructions.

## License

MIT
