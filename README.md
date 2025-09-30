# Audicle

Audicle（Article + Audio）は、ウェブページ上の記事コンテンツを音声で読み上げる Chrome 拡張機能です。

クリックした段落から、記事の最後までをインテリジェントに読み上げ、再生箇所をハイライトすることで、快適な「ながら読書」体験を提供します。

## ✨ 主な機能

- **ワンクリック再生**: 記事の読みたい段落をクリックするだけで、そこから再生が開始されます
- **インテリジェントな本文抽出**: Mozilla Readability.js を活用し、広告やサイドバーなどの不要な要素を除去
- **構造を意識した読み上げ**: 見出しや箇条書きを認識し、自然な読み上げを実現
- **連続再生 & プリフェッチ**: 記事の最後まで音声を自動で連続再生
- **同期ハイライト**: 現在再生中の段落がリアルタイムでハイライト
- **複数 TTS エンジン対応**: Google TTS、Edge TTS、API サーバーなどから選択可能

## 📂 プロジェクト構造

本プロジェクトはモノレポ構成を採用しています：

```
/
├── packages/
│   ├── chrome-extension/     # Chrome 拡張機能本体
│   ├── api-server/           # FastAPI ベースの TTS API サーバー
│   ├── google-tts-server/    # Google Cloud TTS 専用サーバー
│   ├── python-tts-server/    # Python Edge TTS サーバー
│   └── docker-tts-server/    # Docker 版 Edge TTS サーバー
├── .gitignore
└── README.md
```

## 🚀 クイックスタート

### 1. Chrome 拡張機能のインストール

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `packages/chrome-extension/` ディレクトリを選択

### 2. TTS サーバーの選択（オプション）

デフォルトでは Google TTS を使用しますが、より高品質な音声が必要な場合は以下のサーバーを起動してください：

#### API サーバー（推奨）

```bash
cd packages/api-server
docker-compose up -d
```

#### Google Cloud TTS サーバー

```bash
cd packages/google-tts-server
docker-compose up -d
```

#### Edge TTS サーバー

```bash
cd packages/python-tts-server
source venv/bin/activate  # 仮想環境作成後
python server.py
```

### 3. 使用開始

1. 記事ページを開く（例: Wikipedia, Qiita, ブログ記事）
2. Audicle アイコンをクリックし、「読み上げモード」を ON
3. 読みたい段落をクリックすると音声再生が開始されます

## ⚙️ 設定

`packages/chrome-extension/config.json` で TTS エンジンを設定：

```json
{
  "synthesizerType": "google_tts" // または "api_server", "edge_tts" など
}
```

利用可能なエンジン：

- `google_tts`: Google 翻訳 TTS（デフォルト）
- `api_server`: 自前 API サーバー（高品質）
- `edge_tts`: Microsoft Edge TTS
- `edge_tts_docker`: Docker 版 Edge TTS

## 🧪 テスト

### 基本テスト

```bash
# 拡張機能のテストページを開く
open packages/chrome-extension/test/test.html
```

### API サーバーテスト

```bash
# サーバー起動確認
curl http://localhost:8000/

# 音声合成テスト
curl -X POST http://localhost:8000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは", "voice": "ja-JP-NanamiNeural"}' \
  --output test.mp3
```

## 🔧 開発

### Dev Container での開発（推奨）

このプロジェクトは VS Code Dev Containers をサポートしています。一貫した開発環境を簡単に構築できます。

#### Dev Container の使用方法

1. **VS Code をインストール**
2. **Dev Containers 拡張機能をインストール**
3. **プロジェクトを開く**: `File > Open Folder` でプロジェクトルートを選択
4. **コンテナを開く**: コマンドパレット (`Ctrl+Shift+P`) で "Dev Containers: Reopen in Container" を実行
5. **環境構築完了**: 自動的に必要なツールと拡張機能がインストールされます

Dev Container には以下のツールが含まれています：

- Node.js & npm (Chrome 拡張機能開発用)
- Python & pip (API サーバー開発用)
- Docker & Docker Compose (コンテナ化されたサービス用)
- Git & GitHub CLI
- 各種 VS Code 拡張機能（Python, Docker, Chrome Debug など）

#### ポートフォワーディング

Dev Container では以下のポートが自動的にフォワードされます：

- `8000`: API Server
- `8001`: Google TTS Server
- `8002`: Python TTS Server

### ローカル環境構築（手動）

Dev Container を使用しない場合は、手動で環境を構築してください：

```bash
# Node.js 依存関係（Chrome 拡張機能用）
cd packages/chrome-extension
npm install

# Python 依存関係（API サーバー用）
cd ../api-server
pip install -r requirements.txt
```

### 新しい TTS エンジンの追加

1. `packages/chrome-extension/background.js` の `SynthesizerFactory` に新しいクラスを追加
2. `AUDIO_SYNTHESIS_MODULES.md` を更新
3. `config.json` で設定可能に

### 新しいサイト対応ルールの追加

`packages/chrome-extension/content-extract/rules.js` を編集：

```javascript
SITE_SPECIFIC_RULES = {
  "example.com": {
    id: "example-custom",
    priority: 1000,
    contentSelector: "article p, .content p",
    description: "example.com 用カスタム抽出ルール",
  },
};
```

## 📖 詳細ドキュメント

- [Chrome 拡張機能詳細](packages/chrome-extension/README.md)
- [API サーバー仕様](packages/api-server/README.md)
- [音声合成モジュール](packages/chrome-extension/AUDIO_SYNTHESIS_MODULES.md)
- [実装完了レポート](packages/completion-report.md)

## 📝 注意事項

- **対応言語**: 日本語と英語に最適化
- **利用制限**: Google TTS は非公式利用のため、大量リクエスト時はブロックされる可能性あり
- **プライバシー**: テキストが外部サーバーに送信されます
- **ブラウザ**: Google Chrome 向け（Chromium ベースブラウザでも動作可能）

## 🤝 貢献

1. Fork してブランチを作成
2. 変更を実装
3. テストを実行
4. Pull Request を作成

## 📄 ライセンス

MIT License
