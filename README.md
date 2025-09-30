# Auticle

Auticle（Article + Audio）は、ウェブページ上の記事コンテンツを音声で読み上げるプラットフォームです。

クリックした段落から、記事の最後までをインテリジェントに読み上げ、再生箇所をハイライトすることで、快適な「ながら読書」体験を提供します。

## ✨ 主な機能

- **ワンクリック再生**: 記事の読みたい段落をクリックするだけで、そこから再生が開始されます
- **インテリジェントな本文抽出**: Mozilla Readability.js を活用し、広告やサイドバーなどの不要な要素を除去
- **構造を意識した読み上げ**: 見出しや箇条書きを認識し、自然な読み上げを実現
- **連続再生 & プリフェッチ**: 記事の最後まで音声を自動で連続再生
- **同期ハイライト**: 現在再生中の段落がリアルタイムでハイライト
- **複数 TTS エンジン対応**: Google TTS、Edge TTS、API サーバーなどから選択可能
- **Web UI**: Next.js ベースのモダンなWebアプリケーション
- **記事管理**: 保存した記事の一覧表示と管理機能
- **音声キャッシュ**: 高速な再生のためのキャッシュ機能

## 📂 プロジェクト構造

本プロジェクトはモノレポ構成を採用しています：

```
/
├── packages/
│   ├── chrome-extension/     # Chrome 拡張機能本体
│   ├── api-server/           # FastAPI ベースの TTS API サーバー
│   ├── web-app/              # Next.js ベースの Web UI アプリケーション
│   ├── google-tts-server/    # Google Cloud TTS 専用サーバー (_archive/)
│   ├── python-tts-server/    # Python Edge TTS サーバー (_archive/)
│   └── docker-tts-server/    # Docker 版 Edge TTS サーバー (_archive/)
├── .gitignore
├── LICENSE                   # MIT License
├── README.md
└── BRANCH_REPORT.md          # 最新開発レポート
```

## 🚀 クイックスタート

### 1. API サーバーの起動（共通）

```bash
cd packages/api-server
docker-compose up -d
```

### 2. 利用方法の選択

#### オプション A: Chrome 拡張機能を使用

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `packages/chrome-extension/` ディレクトリを選択

#### オプション B: Web アプリケーションを使用

```bash
cd packages/web-app
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて使用開始

### 3. 使用開始

#### Chrome 拡張機能の場合:
1. 記事ページを開く（例: Wikipedia, Qiita, ブログ記事）
2. Auticle アイコンをクリックし、「読み上げモード」を ON
3. 読みたい段落をクリックすると音声再生が開始されます

#### Web アプリケーションの場合:
1. [http://localhost:3000](http://localhost:3000) にアクセス
2. 「+ 新しい記事を読む」ボタンをクリック
3. 記事URLを入力して「読込」
4. 再生ボタンをクリックして音声読み上げを開始

## ⚙️ 設定

### Chrome 拡張機能設定

`packages/chrome-extension/config.json` で TTS エンジンを設定：

```json
{
  "synthesizerType": "google_tts" // または "api_server", "edge_tts" など
}
```

### Web アプリケーション設定

`packages/web-app/.env.local` で API サーバーの URL を設定：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 利用可能な TTS エンジン

- `google_tts`: Google 翻訳 TTS（デフォルト）
- `api_server`: 自前 API サーバー（高品質、2倍速対応）
- `edge_tts`: Microsoft Edge TTS
- `edge_tts_docker`: Docker 版 Edge TTS

## 🧪 テスト

### Chrome 拡張機能テスト

```bash
# 拡張機能のテストページを開く
open packages/chrome-extension/test/test.html
```

### Web アプリケーションのテスト

```bash
# Web App のテスト実行
cd packages/web-app
npm run dev

# ブラウザで http://localhost:3000 にアクセスしてテスト
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

# 本文抽出テスト
curl -X POST http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

## 🔧 開発

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

- Node.js & npm (Chrome 拡張機能 & Web App 開発用)
- Python & pip (API サーバー開発用)
- Docker & Docker Compose (コンテナ化されたサービス用)
- Git & GitHub CLI
- 各種 VS Code 拡張機能（Python, Docker, Chrome Debug など）

#### ポートフォワーディング

Dev Container では以下のポートが自動的にフォワードされます：

- `3000`: Web App (Next.js)
- `8000`: API Server
- `8001`: Google TTS Server
- `8002`: Python TTS Server

### ローカル環境構築（手動）

Dev Container を使用しない場合は、手動で環境を構築してください：

```bash
# Node.js 依存関係（Chrome 拡張機能 & Web App 用）
cd packages/chrome-extension
npm install

cd ../web-app
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

### Web アプリケーション
- [Web App README](packages/web-app/README.md)
- [開発ブランチレポート](BRANCH_REPORT.md)
- [実装完了レポート](packages/web-app/COMPLETION_REPORT.md)

### Chrome 拡張機能
- [Chrome 拡張機能詳細](packages/chrome-extension/README.md)
- [音声合成モジュール](packages/chrome-extension/AUDIO_SYNTHESIS_MODULES.md)

### API サーバー
- [API サーバー仕様](packages/api-server/README.md)
- [API サーバー実装レポート](packages/completion-report.md)

## 📝 注意事項

- **対応言語**: 日本語と英語に最適化
- **利用制限**: Google TTS は非公式利用のため、大量リクエスト時はブロックされる可能性あり
- **プライバシー**: テキストが外部サーバーに送信されます
- **ブラウザ**: Google Chrome 向け（Chromium ベースブラウザでも動作可能）
- **Web App**: 最新の機能（2倍速再生、キャッシュ、記事管理）は Web App で利用可能

## 🤝 貢献

1. Fork してブランチを作成
2. 変更を実装
3. テストを実行
4. Pull Request を作成

## 📄 ライセンス

MIT License - [LICENSE](LICENSE) を参照
