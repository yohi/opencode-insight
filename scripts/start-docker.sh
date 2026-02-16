#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

# Docker コンテナをビルド＆起動
docker compose up -d --build

# コンテナが起動するまで少し待つ
echo "Waiting for container to be ready..."
sleep 2

# 公開されたポートを取得
PORT=$(docker compose port app 3000 | cut -d: -f2)

if [ -z "$PORT" ]; then
    echo "Error: Could not determine the port."
    exit 1
fi

URL="http://localhost:$PORT"

echo "Application is running at: $URL"

# ブラウザを開く
if command -v xdg-open > /dev/null; then
    xdg-open "$URL"
elif command -v open > /dev/null; then
    open "$URL"
elif command -v start > /dev/null; then
    start "$URL" # Windows (cmd)
else
    echo "Could not detect web browser command. Please open $URL manually."
fi
