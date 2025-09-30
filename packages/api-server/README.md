# Audicle API Server

この API サーバーは、Web ページからのテキスト抽出と Google Cloud Text-to-Speech を使用したテキスト-to-音声合成を提供します。

This API server provides text extraction from web pages and text-to-speech synthesis using Google Cloud Text-to-Speech.

## Features

- **Text Extraction**: Extract readable content from web pages using Readability.js
- **Text-to-Speech**: Convert text to speech using Google Cloud Text-to-Speech API

機能

- **テキスト抽出**: Readability.js を使用して Web ページから読み取り可能なコンテンツを抽出
- **テキスト-to-音声**: Google Cloud Text-to-Speech API を使用してテキストを音声に変換

## Setup

セットアップ

### Prerequisites

前提条件

- Python 3.11+
- Node.js (for text extraction)
- Google Cloud Platform account with Text-to-Speech API enabled

- Python 3.11 以上
- Node.js (テキスト抽出用)
- Text-to-Speech API が有効化された Google Cloud Platform アカウント

### Installation

インストール

1. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

1. Python 依存関係をインストール:

   ```bash
   pip install -r requirements.txt
   ```

1. Set up Google Cloud credentials:

   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Place the key file in `credentials/service-account.json`
   - The environment variable `GOOGLE_APPLICATION_CREDENTIALS` will be set automatically in Docker

1. Google Cloud 認証情報を設定:
   - Google Cloud Console でサービスアカウントを作成
   - JSON キーファイルをダウンロード
   - キーファイルを `credentials/service-account.json` に配置
   - 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` は Docker で自動的に設定されます

### Running with Docker

Docker で実行

```bash
docker-compose up --build
```

The server will be available at `http://localhost:8000`

サーバーは `http://localhost:8000` で利用可能になります

## API Endpoints

API エンドポイント

### GET /

Returns server status information.

サーバーのステータス情報を返します。

### POST /extract

Extract text content from a web page.

Web ページからテキストコンテンツを抽出します。

**Request:**

リクエスト:

```json
{
  "url": "https://example.com"
}
```

**Response:**

レスポンス:

```json
{
  "title": "Page Title",
  "chunks": ["Text chunk 1", "Text chunk 2", ...]
}
```

### POST /synthesize

Convert text to speech.

テキストを音声に変換します。

**Request:**

リクエスト:

```json
{
  "text": "Hello, world!",
  "voice": "ja-JP-Wavenet-B"
}
```

**Response:** MP3 audio file

レスポンス: MP3 オーディオファイル

## Configuration

設定

- Default voice: `ja-JP-Wavenet-B` (Japanese)
- Audio format: MP3
- Fallback audio file: `fallback.mp3` (if synthesis fails)

- デフォルト音声: `ja-JP-Wavenet-B` (日本語)
- オーディオ形式: MP3
- フォールバックオーディオファイル: `fallback.mp3` (合成が失敗した場合)

## Development

開発

To run locally without Docker:

Docker なしでローカルで実行するには:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
python main.py
```
