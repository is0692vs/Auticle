# Docker Google Cloud TTS Server (Audicle)

Google Cloud Text-to-Speech を Docker 上で提供し、Audicle の Chrome 拡張から利用できるようにするためのサーバーです。`docker-tts-server` の Edge TTS 版と同様に、HTTP 経由で MP3 音声を返します。

## 必要条件

- Docker / Docker Compose
- Google Cloud Text-to-Speech API が有効化された GCP プロジェクト
- サービスアカウント鍵 (JSON)

> ⚠️ サービスアカウント鍵はリポジトリにコミットしないでください。`credentials/` ディレクトリに配置し、JSON ファイルは `.gitignore` により除外されています。

## セットアップ

1. Google Cloud で Text-to-Speech API を有効化し、サービスアカウント鍵 (JSON) を生成します。
2. 生成した JSON を `packages/google-tts-server/credentials/service-account.json` として配置します。
3. コンテナを起動します。

```bash
cd packages/google-tts-server
GOOGLE_TTS_PORT=8002 docker compose up --build -d
```

- `GOOGLE_TTS_PORT` (任意): ローカル公開ポートの上書き。既定は `8002`。
- `GOOGLE_TTS_DEFAULT_VOICE` (任意): 既定音声。初期値は `ja-JP-Standard-A`。
- `GOOGLE_TTS_LANGUAGE_CODE` (任意): フィルタ用の言語コード。初期値は `ja-JP`。

## エンドポイント

- `GET /` : サーバー状態を返します。
- `GET /voices` : 設定言語に合致する音声一覧を返します。
- `POST /synthesize` : `SynthesizeRequest` モデルを受け取り MP3 を返します。
- `POST /synthesize/simple` : `{ "text": "..." }` を受け取り MP3 を返します (Audicle 互換)。

## Audicle 側の設定

Chrome 拡張 `config.json` の `synthesizerType` に `"google_cloud_tts_docker"` を設定します。

```json
{
  "synthesizerType": "google_cloud_tts_docker"
}
```

サーバーは `http://localhost:8002` にバインドされます。別ホストで動かす場合は、ルーティングやポート転送でアクセスしてください。

## トラブルシューティング

- "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set" が表示される → `docker-compose.yml` のボリューム設定を確認してください。
- 403/401 エラー → サービスアカウントに Text-to-Speech API へのアクセス権限があるか確認してください。
- 音声が返らない → `docker compose logs -f` でサーバーログを確認し、API エラーが出ていないか確認してください。
