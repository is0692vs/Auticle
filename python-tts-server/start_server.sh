#!/bin/bash

# Edge TTS Server 起動スクリプト
# Usage: ./start_server.sh

echo "🎤 Edge TTS Server を起動中..."

# 仮想環境をアクティベート
source venv/bin/activate

# サーバー起動
echo "📡 サーバーアドレス: http://localhost:8001"
echo "📄 API ドキュメント: http://localhost:8001/docs"
echo "🔄 停止するには Ctrl+C を押してください"
echo ""

python server.py