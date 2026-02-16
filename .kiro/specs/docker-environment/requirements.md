# Requirements: docker-environment

## Overview

Migrate the execution environment of the existing application (`packages/insight`) to a Bun-based Docker container (Devcontainer for development and Dockerfile for production).

## Requirements (EARS)

### Functional Requirements

* The system **shall** provide a `Dockerfile` optimized for production with a multi-stage build configuration.

* The system **shall** provide a `compose.yaml` (instead of docker-compose.yml) for orchestration of development and production environments.

* The system **shall** persist SQLite database data using Docker Volumes.

* The system **shall** expose ports `3000` (Frontend) and `3001` (Backend) to the host machine.

### Technical Constraints

* The system **must** be built using **oven/bun:1.3.9** (or `oven/bun@sha256:856da45d07aeb62eb38ea3e7f9e1794c0143a4ff63efb00e6c4491b627e2a521`) as the base image.

* The development environment **must** be built using **Devcontainer**, eliminating dependencies on the host environment.

* Source code changes **must** be immediately reflected in the container via Bind Mount (hot reload).

## Environment Setup (Devcontainer)

Create `.devcontainer/devcontainer.json` with the following configuration:

```json
{
  "name": "OpenCode Insight (Bun)",
  "image": "oven/bun:1.3.9",
  "customizations": {
    "vscode": {
      "extensions": [
        "oven.bun-vscode",
        "ms-azuretools.vscode-docker",
        "esbenp.prettier-vscode"
      ]
    }
  },
  "remoteUser": "bun",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  }
}
```

## Testing Strategy

* Tests will be executed using **bun test** (Built-in).
* Command: `docker exec -it opencode-insight bun test` (or via VS Code task)
