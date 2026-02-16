# Requirements: docker-environment

## 概要

既存のアプリケーション（packages/insight）の実行環境を、BunベースのDockerコンテナ（開発用Devcontainerおよび本番用Dockerfile）に完全移行する。

## 要件定義 (EARS)

### 機能要件

* システムは、本番環境向けに最適化されたマルチステージビルド構成の `Dockerfile` を提供 **shall**。

* システムは、開発環境と本番環境のオーケストレーションを行う `compose.yaml` (docker-compose.yml ではなく) を提供 **shall**。

* システムは、SQLiteデータベースのデータを Docker Volume を使用して永続化 **shall**。

* システムは、ホストマシンに対してポート `3000` (Frontend) および `3001` (Backend) を公開 **shall**。

### 技術的制約

* システムは、ベースイメージとして **oven/bun:1.3.9** (または `oven/bun@sha256:856da45d07aeb62eb38ea3e7f9e1794c0143a4ff63efb00e6c4491b627e2a521`) を使用して構築されなければならない **must**。

* 開発環境は **Devcontainer** を使用して構築され、ホスト環境への依存を排除しなければならない **must**。

* ソースコードの変更は、Bind Mount を通じてコンテナ内に即座に反映（ホットリロード）されなければならない **must**。

## 環境構築 (Devcontainer)

以下の設定で `.devcontainer/devcontainer.json` を作成してください:

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

## テスト戦略

* テストは **bun test** (Built-in) で実行する。
* コマンド: `docker exec -it opencode-insight bun test` (または VS Code タスク経由)
