# プロジェクト Audicle: 開発 Issue リスト（最終版）

<aside>
ℹ️

本ドキュメントではプロダクト名を「Audicle」に統一しています。コード上の識別子（例: `auticle/`, `.auticle-clickable`, `data-auticle-id`）は互換性維持のため現状のまま表記・運用している箇所があります。

</aside>

---

### マイルストーン 1: プロジェクト基盤と基本操作の構築

### Issue #1: [Chore] 拡張機能プロジェクトの初期設定

- GitHub: [#1](https://github.com/is0692vs/Auticle/issues/1)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: 開発を開始するための土台となる、最低限のファイル構成と設定を準備する。
- 実装方針
  1. `auticle/` フォルダを作成。
  2. `manifest.json` を作成し、Manifest V3 仕様に準拠した設定を記述（`name`, `version`, `permissions`: `"storage"`, `"activeTab"`, `"scripting"` など）。
  3. `popup.html`, `popup.js`, `content.js`, `background.js`, `icon.png` を空または動作確認用コードを記述した状態で作成。
- [x] 完了条件
  - [x] Chrome の `chrome://extensions` からエラーなく本プロジェクトを読み込めること。
  - [x] ツールバーにアイコンが表示され、クリックすると空の `popup.html` が表示されること。

---

### Issue #2: [Feature] Popup UI の作成と状態の永続化

- GitHub: [#2](https://github.com/is0692vs/Auticle/issues/2)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: ユーザーが拡張機能の有効/無効を切り替える UI を提供し、その設定を永続化させる。
- 実装方針
  1. `popup.html`: `<input type="checkbox">` を使ったトグルスイッチ UI を実装（ID: `toggle-switch`）。
  2. `popup.css`: 上記チェックボックスをモダンなトグルスイッチに見せる CSS を記述。
  3. `popup.js`:
     - `DOMContentLoaded` 時に [`chrome.storage`](http://chrome.storage)`.local.get` で保存された状態を取得し、スイッチに反映（デフォルト `false`）。
     - スイッチの `change` イベントを監視し、[`chrome.storage`](http://chrome.storage)`.local.set` で状態を保存する。
- [x] 完了条件
  - [x] Popup を開くと、トグルスイッチが最後に設定した状態で表示されること。
  - [x] スイッチを切り替えると、その状態が [`chrome.storage`](http://chrome.storage)`.local` に保存されること。

---

### Issue #3: [Chore] 拡張機能各コンポーネント間の通信確立

- GitHub: [#3](https://github.com/is0692vs/Auticle/issues/3)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: Popup での UI 操作を、実際にページ上で動作する `content.js` に伝えるための通信経路を確立する。
- 実装方針
  1. `popup.js`:
     - トグルスイッチの `change` イベント内で、`chrome.tabs.query` でアクティブなタブを取得。
     - `chrome.tabs.sendMessage` を使い、`content.js` に `{ command: 'stateChange', enabled: (boolean) }` を送信。
  2. `content.js`:
     - `chrome.runtime.onMessage.addListener` でメッセージを待ち受け、`console.log` で受信内容を出力して疎通確認。
- [x] 完了条件
  - [x] Popup でスイッチを操作すると、アクティブなページのコンソールに現在の有効状態 (`true`/`false`) がログ出力されること。

---

### マイルストーン 2: 中核となる読み上げ機能の実装

### Issue #4: [Feature] 読み上げモード ON 時の DOM 操作

- GitHub: [#4](https://github.com/is0692vs/Auticle/issues/4)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: テキストのクリック検知とハイライト表示を行うため、対象 DOM 要素を事前に特定・加工する。
- 実装方針
  1. `content.js`:
     - `preparePage()` と `cleanupPage()` を定義し、Issue #3 のメッセージに応じて呼び出す。
     - `preparePage()`: 段落要素（`p` など）に `data-auticle-id` 属性と `.auticle-clickable` クラスを付与。
     - `cleanupPage()`: 追加した属性・クラスを削除して原状復帰。
  2. `styles.css`: `.auticle-clickable` に `{ cursor: pointer; }` などを定義し、`preparePage()` 実行時に動的注入。
- [x] 完了条件
  - [x] 拡張機能を ON にすると、対象段落がクリック可能な見た目になること。
  - [x] 拡張機能を OFF にすると、ページが完全に元の状態に戻ること。

---

### Issue #5: [Feature] クリックによる読み上げトリガー

- GitHub: [#5](https://github.com/is0692vs/Auticle/issues/5)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: 加工済み DOM 要素のクリックを検知し、その位置から読み上げるテキストを収集して `background.js` に渡す。
- 実装方針
  1. `content.js`:
     - `preparePage` 内でクリックイベントを登録（イベント委任）。
     - クリック対象が `.auticle-clickable` なら `data-auticle-id` を取得。
     - すべての `.auticle-clickable` を走査し、クリック ID 以降のテキストを収集・結合。
     - `chrome.runtime.sendMessage` で `background.js` に `{ command: 'play', text: 収集テキスト }` を送信。
- [x] 完了条件
  - [x] 加工された段落をクリックすると `background.js` に `play` コマンドが送信されること。
  - [x] 送信メッセージに、クリック段落から記事末尾までのテキストが含まれること。

---

### Issue #6: [Feature] 背景での音声再生機能

- GitHub: [#6](https://github.com/is0692vs/Auticle/issues/6)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: Web Speech API の不安定さを回避するため、Google 翻訳の TTS と `<audio>` 要素を用いた再生方式にアーキテクチャを変更。
- 実装方針（更新後）
  1. `manifest.json`
     - `host_permissions` に Google 翻訳 TTS へのアクセス許可を追加。
     - `permissions` に `activeTab` を追加（`popup.js` ↔ `content.js` の連携用途）。
  2. `background.js`
     - 受信テキストから Google 翻訳 TTS のエンドポイント URL を生成。
     - `fetch` で MP3 を取得し `data:` URL へ変換。
     - 変換した `data:` URL を `content.js` に返す。
  3. `content.js`
     - クリック段落以降（最大 200 文字）を収集し、`background.js` に再生をリクエスト。
     - 受け取った `data:` URL を `<audio>` の `src` に設定し、再生速度 `2.0` で再生。
     - 再生中に新リクエストが来たら直前の再生を停止して差し替え。
  4. UI（`popup.html`, `popup.js`）
     - 速度調整 UI は廃止。読み上げモードの ON/OFF のみに簡素化。
- 達成したこと
  - クリックされた最初の文章の塊（最大 200 文字）を Google 翻訳 TTS で 2.0 倍速再生するコア再生エンジンを実装。
  - Web Speech API 依存を解消し、環境差に強い構成を確立。
- 残された課題（仕様）
  - Google 翻訳 TTS の文字数制限（約 200 文字）により、長文は途中で止まる。これは現時点では仕様であり、Issue #7 で連続再生により補完する。
- [x] 完了条件（更新）
  - [x] クリックした段落から `<audio>` による音声が 2.0 倍速で再生される。
  - [x] 再生中に別段落をクリックすると即停止し、新しい段落から 2.0 倍速で再生される。

<aside>
🛠️

変更履歴: Web Speech API ベースから、Google 翻訳 TTS + `<audio>` 再生方式へ全面移行。安定性向上と一貫した倍速再生のための設計変更です。

</aside>

---

### Issue #7: [Feature] 読み上げ箇所の同期ハイライト ＋ 連続再生

- GitHub: [#7](https://github.com/is0692vs/Auticle/issues/7)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: Issue #6 の仕様（TTS 約 200 文字）を前提に、チャンク連結の連続再生と再生中箇所の同期ハイライトを統合して実装。
- やったことのまとめ（更新）
  - クリックされた段落から記事の最後まで、連続再生を実装。
  - 再生中の箇所（チャンクが属する段落）をリアルタイムにハイライト。
  - 次チャンクの音声データを先読み（プリフェッチ）して途切れを最小化。
- 主な変更点
  - `content.js`
    - 再生キュー導入: クリック位置以降の本文を約 200 文字で分割し、`playbackQueue` に `{ text, paragraphId }` で格納。
    - 連続再生: `<audio>.onended` をトリガーに次チャンク再生を `background.js` に要求。キューが空になるまで繰り返し。
    - 同期ハイライト: `updateHighlight()` を新設。現在チャンクの `paragraphId` に `.auticle-highlight` を付与し、それ以外を解除。
    - プリフェッチ: 次に再生するチャンク（デフォルト 2 つ先まで）を非同期で要求し、`audioCache` に保存。
  - `background.js`
    - プリフェッチ用 `fetch` コマンドを追加。受け取ったテキストから音声 `data:` URL を生成して返却。
    - 既存の `play` コマンドは即時再生用として継続利用。
- メッセージ仕様（参考）
  - 送信: `{ command: 'play' | 'fetch', text, lang?: 'ja', speed: 2.0 }`
  - 受信: `{ command: 'audio', url: 'data:audio/mp3;...' }`
- [x] 完了条件（更新）
  - [x] 200 文字制限を跨いで記事末尾まで自動で連続再生される。
  - [x] 再生中は現在の塊のみがハイライトされ、次塊へ遷移時にハイライトも移動する。
  - [x] 再生中に別段落をクリックすると直ちに新しい箇所の連続再生に切り替わる。
  - [x] モード OFF で再生が停止し、ハイライトが全解除される。

<aside>
🔄

変更履歴: 同期ハイライトに加え、連続再生とプリフェッチを実装して体感の途切れを解消しました。

</aside>

---

### Issue #19: [Feature] 高度な本文抽出と構造認識の実装

- GitHub: [#19](https://github.com/is0692vs/Auticle/issues/19#top)
- 担当者: [Owner 未設定]
- マイルストーン: 2. 中核となる読み上げ機能の実装（本文抽出の高度化）
- 背景: 現在の抽出は単純なタグ収集（例 `p`）のため、サイドバーやフッターまで読み上げる可能性があり、見出しや箇条書きなどの構造情報も失われる。連続再生の価値を最大化するには、人が読むように本文のみを構造を意識して抽出する必要がある。
- 実装方針
  1. Readability.js の導入
     - ライブラリ（Mozilla/Firefox リーダービュー採用）をプロジェクトに追加。
     - `manifest.json` の `web_accessible_resources` に登録。
     - `content.js` から動的ロード可能にする。
  2. 本文コンテナの特定
     - `handleClick` 実行時に Readability でページ全体の DOM を解析。
     - テキスト密度やタグ構造からメインコンテンツ（`<article>` や `#main-content` 等）を自動特定。
  3. 構造化テキストの抽出
     - 特定コンテナから `p`, `h1`–`h3`, `ul`, `li` 等を順序通りに取得。
     - サイドバー等の不要要素は自然に除外。
  4. 再生キュー生成ロジックの更新
     - 取得要素リストから `playbackQueue` を生成。
     - 要素種別に応じて文頭に短い前置きを付加可能。
       - 見出し: 「見出し。」例: 「見出し。結論」
       - 箇条書き: 「箇条書きです。」例: 「箇条書きです。思ってた業務内容と相当乖離があった」
     - ハイライトは要素のユニーク属性（例 `data-sourcepos`）で DOM と紐付け。
- [ ] 完了条件
  - [x] 読み上げ時にサイドバーやフッター等の無関係テキストが再生されない。
  - [x] 見出し（`h1`–`h6`）が本文の正しい順序で読み上げられる。
  - [x] 箇条書き（`li`）が順番通りに読み上げられる。
  - [ ] 任意: 見出しや箇条書きであることが音声で区別できる工夫がされている。

[Read this first — 開発者向けクイックガイド](https://www.notion.so/Read-this-first-273523e17f9181bbb059d8723658099f?pvs=21)

- PR コメント要約（Issue #19）
- 端末ログ: `git diff main..19revenge --name-only` ほか各種 diff コマンドの実行記録あり
- PR タイトル: `feat: Readability.js を導入してテキスト抽出ロジックを刷新し、本文構造を意識した読み上げを実現`

### 概要

Mozilla Readability.js を導入し、メインコンテンツ自動特定と構造化抽出により、サイドバー/フッターの不要文を除外。本文構造（見出し・箇条書き）を保った読み上げへ移行。

### 実装内容

1. Readability.js の導入

- `lib/Readability.js` 追加（約 2796 行）
- `manifest.json`: `web_accessible_resources` に登録、バージョン 1.0.0 → 1.0.1

2. `content.js` の刷新

- カスタムルール: Qiita 用に `#personal-public-article-body .mdContent-inner` 直下の `p, li, h1-h6, blockquote, pre` を優先
- `injectReadabilityLib()` で動的読み込み
- キュー構築: `buildQueueWithCustomRule` / `buildQueueWithReadability` / `buildQueueWithFallback`
- 構造化テキスト: 見出し「見出し。」、箇条書き「箇条書きです。」の前置き（任意）
- ハイライト: `data-auticle-id` 基点の `updateHighlight()`
- バッチ処理: `BATCH_SIZE=3`、`MAX_RETRIES=2` によるエラー低減

3. `background.js`

- `cleanText()` で URL・特殊文字除去を適用（`play`/`fetch`）
- `batchFetch` 追加で並行バッチ処理

4. その他

- `.gitignore` に `lib/Readability.js` を追加

### テスト

- Chrome で拡張を更新し、Qiita 記事で検証
- 確認観点
  - 本文のみ再生（不要領域は除外）
  - 見出しと箇条書きが順序通りに読み上げられる
  - ハイライトが正しく遷移
  - 失敗時のリトライ動作、バッチ化によるリクエスト削減

### 期待結果

- 構造を意識した本文読み上げに改善
- ログ出力で抽出・エラー再試行の可視化

### 影響範囲・リスク

- 互換性: MV3 準拠、既存のクリック/ハイライトは維持
- 性能: Readability 解析分の遅延が増加する可能性（許容範囲）
- リスク: Google TTS は非公式利用のため、将来は公式 API 検討

### レビューポイント

- Readability.js 採用の妥当性
- Qiita 向けカスタムルールの汎用化余地
- バッチ処理によるエラー低減効果

---

### マイルストーン 3: UI/UX の改善と仕上げ

### Issue #8: [Feature] 読み上げの停止機能

- GitHub: [#8](https://github.com/is0692vs/Auticle/issues/8)
- 担当者: [Developer Name]
- マイルストーン: 3. UI/UX の改善と仕上げ
- コンセプト: 「スイッチ OFF が完全リセット」。OFF で拡張機能の動作を完全終了し、ページをクリーンな状態へ戻す。
- 要件（整理）
- popup.js の責務: トグル OFF 時は [`chrome.storage`](http://chrome.storage) に `enabled: false` を記録するだけ。停止メッセージは送らない。
- content.js の責務: [`chrome.storage`](http://chrome.storage) の変化を監視し、`enabled: false` を検知したらリセット処理を実行。
  - 音声リセット: 再生中の `<audio>` を即停止。
  - ハイライトリセット: `.auticle-highlight` をすべて解除。
  - 再生キューリセット: `playbackQueue = []`、`queueIndex = 0` にし、意図せぬ再開を防止。
- 追加実装（ユーザーフィードバック反映）
- 一時停止機能を追加（電源 OFF とは別軸）。
  - popup.html: トグルの下に「一時停止/再開」ボタンを追加（`#pause-resume-btn`）。
  - popup.js: クリックで `togglePauseResume` を `content.js` に送信。状態に応じてボタン文言を動的変更。
  - content.js:
    - `togglePauseResume` 受信で一時停止または再開。
    - 一時停止: `audioPlayer.pause()`、`isPlaying = false`。ハイライトは維持。
    - 再開: `playQueue()` で続きから再生。
    - `cleanupPage()` を更新し、OFF リセット時は `audioCache.clear()` を実施。一方、一時停止ではキャッシュは保持（`audioCache` は消さない）。
- [x] 完了条件（更新）
  - [x] OFF で音声停止、ハイライト解除、キュー空、キャッシュクリアで完全リセットされる。
  - [x] 一時停止時は音声のみ停止し、ハイライトとキャッシュが保持され、再開で続きから再生できる。
  - [x] popup.js は OFF でストレージ更新のみを行い、停止メッセージを送らない。
- テスト方法

1. 環境準備

- `chrome://extensions/` で拡張を更新。
- Qiita 記事（例: [記事リンク](https://qiita.com/irochi/items/bdba7a02e5394a79f81f%EF%BC%89%E3%82%92%E9%96%8B%E3%81%8F%E3%80%82)）を開く。

2. 基本動作

- トグル ON → 段落をクリックし再生開始。

3. 一時停止機能

- popup の「一時停止」をクリック → 再生停止、ハイライト維持、ボタンは「再開」に。
- 「再開」をクリック → 続きから再生、同じ箇所はキャッシュから再生されフェッチしない。

4. 電源 OFF 機能

- トグル OFF → 再生停止、ハイライト解除、クリックしても再生されない。
- ページをリロード → クリーン状態を確認。

5. 期待ログ

- 一時停止/再開時に `Playback paused` / `Playback resumed` が出力される。

<aside>
⏯️

変更履歴: OFF を完全リセットと定義しつつ、ユーザー要望で一時停止を追加。OFF はキャッシュも含めて全消去、一時停止はキャッシュとハイライトを保持します。

</aside>

---

### Issue #20: [Refactor] 音声合成モジュールの疎結合化

- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装（音声合成の疎結合化）
- 背景: 将来的な音声合成エンジンの追加・変更を容易にするため、音声合成ロジックを独立したモジュールとして切り出し、設定ファイルで方式を指定可能にする。
- 実装方針
  1. 音声合成基底クラス・ファクトリーパターンの導入
     - `AudioSynthesizer` 基底クラス：`synthesize(text)` メソッドでテキスト → 音声データ URL 返却の統一インターフェースを定義
     - `GoogleTTSSynthesizer` 実装クラス：Google 翻訳 TTS を利用した音声合成処理
     - `SynthesizerFactory` ファクトリクラス：設定に基づいて適切なシンセサイザーインスタンスを生成
  2. 設定ベース方式選択
     - `config.json` 新規作成：`{"synthesizerType": "google_tts"}` で使用方式を指定
     - `manifest.json` 更新：`web_accessible_resources` に config.json を追加
  3. 責務分離
     - 音声合成モジュール：「テキスト → 音声データ URL 返却」のみを責務とし、バッチ処理や先読みは呼び出し側（background.js）の責任
     - 設定変更：popup 等での動的切替は不要、拡張機能リロードで反映

### アーキテクチャ・データやり取り構造

#### 1. モジュール構成

```text
background.js
├── AudioSynthesizer (基底クラス)
│   └── synthesize(text): Promise<string> // 音声データURLを返却
├── GoogleTTSSynthesizer (実装クラス)
│   └── synthesize(text): Promise<string> // Google翻訳TTS利用
└── SynthesizerFactory (ファクトリクラス)
    └── create(type): AudioSynthesizer // 設定に基づいてインスタンス生成

config.json
├── synthesizerType: string // "google_tts" 等の方式指定

content.js
├── audioErrorハンドリング追加
└── リトライ・スキップ処理
```

#### 2. データフロー

```text
1. 拡張機能起動
   background.js → config.json読込 → SynthesizerFactory.create() → インスタンス生成

2. 音声再生リクエスト
   content.js → background.js: { command: 'play'/'fetch', text, ... }
   background.js → synthesizer.synthesize(text) → 音声データURL生成
   background.js → content.js: { command: 'audio', url: 'data:audio/mp3;...' }
   content.js → audio要素で再生・エラーハンドリング

3. 設定変更
   config.json編集 → 拡張機能リロード → 新しい方式で動作
```

#### 3. 拡張ポイント（将来）

新しい音声合成方式の追加手順：

1. `AudioSynthesizer` を継承した新クラスを作成（例：`AzureTTSSynthesizer`）
2. `SynthesizerFactory.create()` に新方式の分岐を追加
3. `config.json` の `synthesizerType` を新方式に変更
4. 拡張機能リロード

#### 4. インターフェース仕様

```javascript
// 音声合成基底クラス
class AudioSynthesizer {
  async synthesize(text) {
    // テキスト → 音声データURL（data:audio/mp3;base64,...）
    throw new Error("Must be implemented by subclass");
  }
}

// Google TTS実装
class GoogleTTSSynthesizer extends AudioSynthesizer {
  async synthesize(text) {
    // Google翻訳TTSエンドポイントでMP3取得 → data URL変換
    const response = await fetch(
      `https://translate.google.com/translate_tts?...`
    );
    const arrayBuffer = await response.arrayBuffer();
    return `data:audio/mp3;base64,${btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    )}`;
  }
}

// ファクトリ
class SynthesizerFactory {
  static async create(type) {
    switch (type) {
      case "google_tts":
        return new GoogleTTSSynthesizer();
      default:
        throw new Error(`Unknown synthesizer type: ${type}`);
    }
  }
}
```

- [x] 完了条件
  - [x] Google TTS による音声再生が従来と同じように動作する
  - [x] `config.json` で音声合成方式を指定できる
  - [x] 音声合成ロジックが独立したモジュールとして疎結合化されている
  - [x] 将来の音声合成エンジン追加が容易な構造になっている
  - [x] content.js で audio エラー時のリトライ・スキップ処理が実装されている

> 🔧 変更履歴: Google TTS の音声合成ロジックを疎結合モジュールとして分離し、設定ベース方式選択とファクトリパターンを導入しました。将来の拡張性を確保しつつ、既存機能を完全に維持しています。

---

### Issue #9: [Feature] 視覚的なフィードバック

### Issue #10: [Enhancement/Refactoring] 音声合成方式の切替対応

### やったことまとめ

- 戦略パターンで方式切替を実装（Google 翻訳 TTS／Web Speech API／外部 API ダミー）
- 抽象層を導入：`AudioSynthesizer` 基底クラスと `SynthesizerFactory` で生成を一元化
- 設定管理：`config.json` に `synthesizerType` と各種パラメータを定義。`manifest.json` で参照可能に
- UI 連携：popup ドロップダウンで方式選択し、[`chrome.storage`](http://chrome.storage) に永続化
- 主要変更：
  - `background.js` 方式分岐と統合合成関数、バッチ処理の更新
  - `content.js` `audioError` メッセージハンドリング追加
  - `popup.html` / `popup.js` 方式選択 UI と設定連携
- 既存機能（連続再生、プリフェッチ、バッチ）を維持しつつエラーハンドリングを強化

### テスト

- 拡張読込：chrome://extensions → 開発者モード → パッケージ化されていない拡張機能で `auticle/` を選択
- 基本動作：popup で方式選択 → 読み上げモード ON → 記事段落をクリック → 選択方式で再生される
- 方式切替：Google 翻訳 TTS で確認 → ブラウザ標準へ切替 → 同一箇所で音声差分を確認 → リロード後も選択保持
- 設定反映：`config.json` で外部 API を `enabled: true` → 拡張再読込 → popup に選択肢が出る → 選択時は適切にエラー表示（ダミー）
- 異常値検証：`synthesizerType` を無効値に → 再読込でコンソールにエラーが出る → `google_tts` に戻すと復旧
- デバッグログ確認：DevTools に「設定読み込み完了」「音声合成方法: …」「音声合成方法を … に変更しました」等が出力される
- GitHub: [リンク](https://github.com/is0692vs/Audicle/issues/28)
- Labels: `enhancement`, `refactoring`
- マイルストーン: 3. UI/UX の改善と仕上げ

### 背景

- 音声合成が単一実装に依存。将来のエンジン追加やユーザー選択の提供が困難。

### 実装方針

- `SpeechSynthesizer` インターフェースを定義: `speak(text)`, `stop()`, `getState()`
- 具象クラスを実装: `BrowserSpeechSynthesizer`, `ApiSpeechSynthesizer`（例: http://localhost:8000/synthesize`）にリクエストを送信し、返された音声データを再生するクラス。
  3）
- 設定 UI で方式を選択。選択値を永続化し、起動時に該当実装を生成して利用

### 受け入れ条件

- 設定 UI から方式を選べる
- ブラウザ標準と外部 API の 2 方式で切替でき、選択方式で再生される
- 選択がリロード後も保持される
- 呼び出し側はインターフェース経由で動作する

### タスク

- インターフェース定義
- Browser 実装
- API 実装
- 設定 UI と永続化
- 選択に応じたインスタンス切替
- GitHub: [#9](https://github.com/is0692vs/Auticle/issues/9)
- 担当者: [Developer Name]
- マイルストーン: 3. UI/UX の改善と仕上げ
- 背景: 再生中かどうかを Popup を開かずとも把握できるようにする。
- 実装方針
  1. `background.js`:
     - `chrome.action` API を利用。
     - 再生開始（`speak()` 呼び出し）時に `chrome.action.setIcon({ path: 'images/icon-active.png' })` を実行。
     - 停止・完了・エラー（`stop` 受信時, `onend`, `onerror`）時に `chrome.action.setIcon({ path: 'images/icon-default.png' })` を実行。
     - 代替案: `chrome.action.setBadgeText` で「ON」などのバッジ表示も検討。
- [ ] 完了条件
  - [ ] 再生中は拡張機能アイコンが通常と異なるデザインになること。
  - [ ] 停止または完了でアイコンが元に戻ること。

---

<aside>
📝

補足: 各 Issue の GitHub リンクから直接トラッキングできます。必要に応じて担当者名や追加項目を編集してください。

</aside>
