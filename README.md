# OpenCode Insight

OpenCode Insight は、OpenCode エージェントのアクティビティをリアルタイムで可視化・監視するための開発者ツールです。
タスク、ログ、システムメトリクスを検査するための Web ベースの GUI を提供します。

## クイックスタート

このプロジェクトはモノレポ構成です。メインのアプリケーションは `packages/insight` にあります。

### 前提条件

- [Bun](https://bun.sh) (v1.0.0 以上)

### インストール

```bash
cd packages/insight
bun install
```

### アプリケーションの実行

開発時には、以下の2つのプロセスを実行する必要があります：

1.  **バックエンドサーバー** (WebSocket & ファイル監視)
    ```bash
    # packages/insight ディレクトリ内で実行
    bun run start:server
    ```

2.  **フロントエンドインターフェース**
    ```bash
    # 別のターミナルを開き、packages/insight ディレクトリ内で実行
    bun run dev
    ```

ブラウザで `http://localhost:3000` (またはターミナルに表示されたポート) を開いてください。

### Docker での実行

このプロジェクトは **Devcontainer** をサポートしています。VS Code でプロジェクトを開き、「Reopen in Container」を選択することで、構築済みの開発環境を利用できます。

また、Docker Compose を使用して本番ビルドを実行することも可能です（ルートディレクトリで実行）：

```bash
docker compose up -d --build
```

## プロジェクト構成

- `packages/insight`: コアアプリケーション (SolidStart + Tailwind CSS + WebSocket Server)
- `specs/`: プロジェクト仕様書とドキュメント (SDD)
- `AGENTS.md`: このコードベースで作業する AI エージェント向けのガイドライン

## ドキュメント

- アプリケーションの詳細なドキュメントについては [packages/insight/README.md](./packages/insight/README.md) を参照してください。
- 貢献ガイドラインやエージェントへの指示については [AGENTS.md](./AGENTS.md) を参照してください。

## ライセンス

MIT
