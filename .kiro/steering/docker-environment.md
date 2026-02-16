# Docker Environment Migration Steering

## 目的
既存の `packages/insight` アプリケーションをDockerコンテナ化し、以下の効果を得る。
- 開発環境の統一（"Works on my machine" 問題の解消）
- 本番デプロイの安定化と再現性の確保
- 環境構築の手間削減

## ステータス
- [x] **Planning**: 要件定義・設計完了 (`.kiro/specs/docker-environment/`)
- [ ] **Implementation**: 実装中
- [ ] **Review**: PRレビュー待ち
- [ ] **Merged**: マージ完了

## 成果物
- `packages/insight/Dockerfile`
- `packages/insight/compose.yaml`
- `packages/insight/.devcontainer/`

## 運用手順
### 開発時
1. VS Code で `packages/insight` を開く
2. "Reopen in Container" を実行
3. ターミナルで `bun run dev` (Frontend) / `bun run start:server` (Backend)

### 本番デプロイ
1. `docker compose up -d --build`

## 担当
- Sisyphus (Architecture & Implementation)
