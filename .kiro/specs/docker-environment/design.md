# Design: docker-environment

## Architecture Overview

Migrate the execution environment of the existing application (`packages/insight`) to a Bun-based Docker container (Devcontainer for development and Dockerfile for production).

## Component Design

### Mermaid Diagram

```mermaid
graph TD
    User -->|Access (Port 3000)| Frontend[SolidStart Frontend]
    User -->|WebSocket (Port 3001)| Backend[WebSocket Server]
    Frontend -->|API/WS| Backend
    Backend -->|Read/Write| DB[(SQLite: opencode.db)]
    Backend -->|File Watch| FileSystem[Project Files]
    Docker[Docker Container] -->|Bind Mount| FileSystem
    Docker -->|Volume Mount| DB
```

## Components

- **Dockerfile**: `packages/insight/Dockerfile`
  - Base Image: `oven/bun:1.3.9`
  - Multi-stage build (install -> prerelease -> release)
- **Compose**: `packages/insight/compose.yaml`
  - Service: `app`
  - Ports: `3000:3000`, `3001:3001`
  - Volumes: `sqlite_data`, Bind Mount (`./:/app`)
- **Devcontainer**: `packages/insight/.devcontainer/devcontainer.json`
  - Image: `oven/bun:1.3.9`
  - Features: Git
  - Extensions: Bun, Docker, Prettier

## API Endpoints

- No changes (use existing endpoints as is)

## Component Structure

- `packages/insight/.devcontainer/`
  - `devcontainer.json`
- `packages/insight/`
  - `Dockerfile`
  - `compose.yaml`
  - `.dockerignore`

## Database Schema

- **Volume**: `sqlite_data` (Persistence)
  - Mount to `/app/data` (or appropriate path) inside container to persist `opencode.db`.
  - Application DB connection settings may need adjustment (e.g., specifying path via environment variable).

## Data Structures

- None

## Dependencies

- Docker Engine
- Docker Compose
- VS Code (Devcontainer Extension)
