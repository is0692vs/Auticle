# Auticle Web App

Next.jsベースのWebアプリケーション。音楽アプリの歌詞表示のような体験で、Webページの本文を読み上げます。

## Features

- URLからWebページの本文を抽出
- 抽出した本文を段落ごとに音声合成して再生
- 再生中の段落をハイライト表示
- 自動スクロールで再生位置を追従
- クリックで任意の段落から再生開始

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18以上
- api-serverが起動していること (http://localhost:8000)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### Build

```bash
npm run build
npm start
```

## API Integration

このアプリケーションは `packages/api-server` と連携します:

- `POST /extract` - URLからテキストを抽出
- `POST /synthesize` - テキストを音声に変換
