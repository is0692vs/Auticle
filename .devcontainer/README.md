# Audicle Dev Container

この Dev Container は Audicle プロジェクトの開発環境を提供します。

## 機能

- **Node.js & npm**: Chrome 拡張機能開発用
- **Python & pip**: API サーバー開発用
- **Docker & Docker Compose**: コンテナ化されたサービス実行用
- **Git & GitHub CLI**: バージョン管理と GitHub 操作用
- **VS Code 拡張機能**: Python, Docker, Chrome Debug などの開発支援ツール

## 使用方法

### VS Code での使用

1. VS Code を開く
2. `Dev Containers` 拡張機能がインストールされていることを確認
3. `File > Open Folder` でプロジェクトルートを開く
4. コマンドパレット (`Ctrl+Shift+P`) で `Dev Containers: Reopen in Container` を実行
5. コンテナのビルドが完了するまで待つ

### 初回セットアップ

コンテナが起動したら、以下のコマンドを実行して依存関係をインストール：

```bash
# Chrome 拡張機能の依存関係
cd packages/chrome-extension && npm install

# API サーバーの依存関係
cd ../api-server && pip install -r requirements.txt

# Google TTS サーバーの依存関係
cd ../google-tts-server && pip install -r requirements.txt
```

## ポートフォワーディング

以下のポートが自動的にホストにフォワードされます：

- `8000`: API Server (FastAPI)
- `8001`: Google TTS Server
- `8002`: Python TTS Server

## 開発ワークフロー

### Chrome 拡張機能の開発

1. `packages/chrome-extension/` で作業
2. 変更を保存すると自動でリロードされる
3. デバッグは VS Code の Chrome Debug 拡張機能を使用

### API サーバーの開発

1. `packages/api-server/` で作業
2. `python main.py` でローカル実行
3. または `docker-compose up` でコンテナ実行

### TTS サーバーの開発

1. 各 TTS サーバーディレクトリで作業
2. 同様にローカル実行またはコンテナ実行

## トラブルシューティング

### コンテナが起動しない

- Docker Desktop が実行されていることを確認
- VS Code を再起動

### ポートが競合する

- `devcontainer.json` の `forwardPorts` を変更
- またはホストの他のサービスを停止

### 拡張機能が動作しない

- コンテナ内で `Developer: Reload Window` を実行
- 拡張機能が正しくインストールされていることを確認

## カスタマイズ

`devcontainer.json` を編集して環境をカスタマイズできます：

- 追加の VS Code 拡張機能をインストール
- 環境変数を設定
- 追加のポートをフォワード
- postCreateCommand を変更
