# Design: docker-environment

## アーキテクチャ概要

既存のアプリケーション（packages/insight）の実行環境を、BunベースのDockerコンテナ（開発用Devcontainerおよび本番用Dockerfile）に完全移行する。

## コンポーネント設計

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

## コンポーネント

- **Dockerfile**: `packages/insight/Dockerfile`
  - Base Image: `oven/bun:1`
  - Multi-stage build (install -> prerelease -> release)
- **Compose**: `packages/insight/compose.yaml`
  - Service: `app`
  - Ports: `3000:3000`, `3001:3001`
  - Volumes: `sqlite_data`, Bind Mount (`./:/app`)
- **Devcontainer**: `packages/insight/.devcontainer/devcontainer.json`
  - Image: `oven/bun:1`
  - Features: Git
  - Extensions: Bun, Docker, Prettier

## API Endpoints

- 変更なし（既存のエンドポイントをそのまま利用）

## Component Structure

- `packages/insight/.devcontainer/`
  - `devcontainer.json`
- `packages/insight/`
  - `Dockerfile`
  - `compose.yaml`
  - `.dockerignore`

## Database Schema

- **Volume**: `sqlite_data` (永続化用)
  - コンテナ内の `/app/data` (または適切なパス) にマウントし、ここに `opencode.db` を配置・永続化する。
  - アプリケーション側のDB接続設定もこれに合わせて調整が必要になる可能性がある（環境変数でパスを指定など）。

## データ構造

- 特になし

## 依存関係

- Docker Engine
- Docker Compose
- VS Code (Devcontainer Extension)
