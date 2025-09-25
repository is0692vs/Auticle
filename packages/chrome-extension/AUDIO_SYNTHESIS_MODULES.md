# 音声合成モジュール一覧

Audicle で使用可能な音声合成エンジンとその設定方法

## 🎯 概要

Audicle は疎結合な音声合成モジュール設計を採用しており、複数の音声合成エンジンを切り替えて使用できます。  
`config.json` の `synthesizerType` で使用するエンジンを指定します。

## 📋 利用可能なモジュール

### 1. Go**LAN アクセス設定**:

Docker 版は固定で `localhost:8001` を使用します。LAN 内の他 PC から利用する場合は、Docker 側でポート公開設定を調整するか、ポートフォワーディングを使用してください：

```bash
# 例: SSH ポートフォワーディング
ssh -L 8001:localhost:8001 server-pc
```

## 🔧 設定方法

**設定値**: `"google_tts"`

```json
{
  "synthesizerType": "google_tts"
}
```

**特徴**:

- ✅ **高品質**: Google 翻訳の音声合成エンジンを使用
- ✅ **日本語対応**: 自然な日本語読み上げ
- ✅ **英語対応**: 英語テキストも適切に読み上げ
- ✅ **無料**: 追加コストなし
- ⚠️ **ネット必須**: インターネット接続が必要
- ⚠️ **非公式**: Google 翻訳の非公式利用

**適用場面**:

- 一般的な記事の読み上げ
- 日本語・英語混在コンテンツ
- 高品質な音声が必要な場合

**技術詳細**:

- エンドポイント: `https://translate.google.com/translate_tts`
- 音声形式: MP3
- 言語: 日本語 (tl=ja)

---

### 2. Test Synthesizer (開発用)

**設定値**: `"test"`

```json
{
  "synthesizerType": "test"
}
```

**特徴**:

- 🔧 **開発専用**: テスト・デバッグ用途
- ✅ **オフライン**: ネット接続不要
- ✅ **高速**: 即座に応答
- ⚠️ **固定音声**: 常に同じサンプル音声を再生
- ❌ **テキスト無視**: 実際のテキスト内容を読まない

**適用場面**:

- 拡張機能の動作テスト
- オフライン環境での開発
- 音声再生機能のデバッグ

**技術詳細**:

- 音声ファイル: `sample.mp3` を使用
- 音声形式: MP3
- レスポンス: 固定

---

### 3. Edge TTS (高品質・最新)

**設定値**: `"edge_tts"`

```json
{
  "synthesizerType": "edge_tts"
}
```

**特徴**:

- ✅ **最高品質**: Microsoft Edge TTS エンジンによる極めて自然な音声
- ✅ **多様な音声**: 複数の日本語音声から選択可能
- ✅ **高速レスポンス**: ローカルサーバーによる高速処理
- ✅ **カスタマイズ可能**: 話速・音程の細かな調整が可能
- ✅ **安定性**: 公式 API による安定した動作
- ⚠️ **サーバー必須**: Python TTS Server の起動が必要
- ⚠️ **初回設定**: セットアップが必要

**適用場面**:

- 最高品質の音声が必要な場合
- 長時間の音声読み上げ
- プロフェッショナルな用途
- 音声品質にこだわりがある場合

**技術詳細**:

- サーバー: Python Edge TTS Server (http://localhost:8001)
- 音声形式: MP3
- デフォルト音声: ja-JP-NanamiNeural (女性)
- 利用可能音声: Nanami, Keita, Aoi, Daichi, Mayu, Naoki, Shiori

**セットアップ手順**:

1. **Python TTS Server 起動**:

   ```bash
   cd python-tts-server
   ./start_server.sh
   ```

2. **設定変更**:

   ```json
   {
     "synthesizerType": "edge_tts"
   }
   ```

3. **拡張機能リロード**: Chrome 拡張機能を更新

---

### 4. Edge TTS Docker (LAN 対応・高品質)

**設定値**: `"edge_tts_docker"`

```json
{
  "synthesizerType": "edge_tts_docker"
}
```

**特徴**:

- ✅ **最高品質**: Microsoft Edge TTS エンジンによる極めて自然な音声
- ✅ **Docker 化**: 環境差によるトラブルを回避、一貫した動作を保証
- ✅ **LAN アクセス**: 同じネットワーク内の他デバイスからアクセス可能
- ✅ **設定可能**: .env ファイルでホスト・ポート設定を管理
- ✅ **高速レスポンス**: コンテナ化されたローカルサーバーによる高速処理
- ✅ **安定性**: 公式 API による安定した動作
- ✅ **スケーラブル**: Docker Compose による簡単な運用管理
- ⚠️ **Docker 必須**: Docker と Docker Compose の環境が必要
- ⚠️ **初回セットアップ**: コンテナ構築に時間がかかる場合がある

**適用場面**:

- 複数デバイス間での音声合成サーバー共有
- 開発チームでの統一された音声合成環境
- LAN 内の他 PC から音声合成を利用したい場合
- 安定した本番環境での長期運用
- Docker 環境での統合開発

**技術詳細**:

- サーバー: Docker 化された Python Edge TTS Server
- デフォルトエンドポイント: `http://localhost:8001` (固定設定)
- 音声形式: MP3
- デフォルト音声: ja-JP-NanamiNeural (女性)
- LAN アクセス: 0.0.0.0 バインディングで全インターフェースに対応

**セットアップ手順**:

1. **Docker サーバー起動**:

   ```bash
   cd docker-tts-server
   docker-compose up -d
   ```

2. **拡張機能設定**:

   ```json
   {
     "synthesizerType": "edge_tts_docker"
   }
   ```

3. **拡張機能リロード**: Chrome 拡張機能を更新

4. **動作確認**:

   ```bash
   curl http://localhost:8001/
   ```

**LAN 設定例**:

```json
// PC-A (サーバー): docker-tts-server を起動
// PC-B (クライアント): 以下の設定で PC-A のサーバーを利用
{
  "synthesizerType": "edge_tts_docker",
  "dockerHost": "192.168.1.100", // PC-A の IP アドレス
  "dockerPort": "8001"
}
```

## 🔧 設定方法

### 1. 設定ファイルの編集

`audicle/config.json` を編集：

```json
{
  "synthesizerType": "google_tts" // または "test", "edge_tts", "edge_tts_docker"
}
```

**Docker 版を使用する場合**:

```json
{
  "synthesizerType": "edge_tts_docker"
}
```

### 2. 拡張機能のリロード

1. `chrome://extensions/` を開く
2. Audicle 拡張機能の「更新」ボタンをクリック
3. 設定が反映されます

### 3. 動作確認

- 任意のページで読み上げ機能を実行
- Console で以下のログを確認:
  ```
  [GoogleTTSSynthesizer] Synthesizing: "テキスト内容"
  ```
  または
  ```
  [TestSynthesizer] Request for text: "テキスト内容" - returning sample.mp3
  ```

## 🚀 新しいモジュールの追加

### アーキテクチャ概要

```javascript
// 1. 基底クラス
class AudioSynthesizer {
  async synthesize(text) {
    // 実装が必要
  }
}

// 2. 具象クラス
class NewSynthesizer extends AudioSynthesizer {
  async synthesize(text) {
    // 独自の音声合成ロジック
  }
}

// 3. ファクトリ登録
class SynthesizerFactory {
  static create(type) {
    switch (type) {
      case "new_engine":
        return new NewSynthesizer();
      // ...
    }
  }
}
```

### 実装手順

1. **新クラス作成**: `background.js` に新しい Synthesizer クラスを追加
2. **ファクトリ登録**: `SynthesizerFactory.create()` に新しいケースを追加
3. **設定値追加**: `config.json` で新しい `synthesizerType` を指定可能に
4. **テスト実行**: 動作確認とデバッグ

### 推奨される追加候補

- **Azure Cognitive Services**: 高品質な商用 TTS
- **Amazon Polly**: AWS の音声合成サービス
- **Web Speech API**: ブラウザ内蔵の音声合成
- **ElevenLabs**: AI 音声合成サービス
- **OpenAI TTS**: ChatGPT の音声合成

## 🚨 注意事項

### Google TTS 使用時

- **利用制限**: 大量リクエストでブロックされる可能性
- **プライバシー**: テキストが Google サーバーに送信される
- **安定性**: 非公式 API のため将来利用不可の可能性

### Test Synthesizer 使用時

- **本番非推奨**: 開発・テスト専用
- **音声品質**: 実際の読み上げ品質は確認不可

### Edge TTS Docker 使用時

- **Docker 必須**: Docker と Docker Compose の環境が必要
- **ポート開放**: LAN アクセスの場合はファイアウォール設定を確認
- **リソース使用量**: メモリ 200-400MB、ディスク容量 約 800MB が必要
- **初回起動**: 依存関係のダウンロードで時間がかかる場合がある
- **ネットワーク**: 初回は Edge TTS ライブラリのダウンロードでインターネット接続が必要

### 設定変更時

- **拡張機能リロード必須**: 設定変更後は必ずリロード
- **キャッシュクリア**: 古い音声データがキャッシュされる場合あり

## ✅ トラブルシューティング

### Q1: 音声が再生されない

- 設定値が正しいか config.json を確認
- 拡張機能をリロードしたか確認
- Console でエラーログを確認

### Q2: Google TTS が動作しない

- インターネット接続を確認
- ファイアウォール・プロキシ設定を確認
- 一時的に"test"に切り替えて動作確認

### Q3: 新しいモジュールを追加したい

- 上記の「新しいモジュールの追加」セクションを参照
- 基底クラス `AudioSynthesizer` を継承
- `SynthesizerFactory` への登録を忘れずに

---

**関連ファイル**:

- `/audicle/config.json`: 音声合成エンジン設定
- `/audicle/background.js`: 音声合成モジュール実装
- `/README.md`: 基本的な使用方法
