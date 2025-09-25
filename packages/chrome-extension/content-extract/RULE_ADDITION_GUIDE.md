# ルール追加ガイド

Audicle の新サイト対応抽出ルール追加手順

## 🎯 概要

特定のサイトに最適化された抽出ルールを追加する際の詳細手順です。  
このガイドに従って、新しいサイト固有のルールを安全に追加できます。

## 🌐 URL 設定の詳細

### ドメイン指定の仕組み

Audicle は以下の手順でサイトを識別します：

1. **現在のページのドメイン取得**: `window.location.hostname` で取得（例: `qiita.com`）
2. **ルール検索**: `SITE_SPECIFIC_RULES` オブジェクトのキーと照合
3. **マッチ条件確認**: `match.hostname` と `match.pathPattern` をチェック
4. **ルール採用**: 条件に合致すれば、そのサイト専用ルールを使用

### 設定例

#### 📍 基本例: ドメイン全体で有効

```javascript
"medium.com": {
  id: "medium-custom",
  match: {
    hostname: "medium.com",  // medium.com の全ページで有効
    pathPattern: null,       // パス制限なし
  },
  // ...
}
```

#### 📍 応用例: 特定パスのみ有効

```javascript
"github.com": {
  id: "github-readme",
  match: {
    hostname: "github.com",
    pathPattern: "^/[^/]+/[^/]+/?$",  // リポジトリトップページのみ
  },
  // ...
}
```

#### 📍 実際の Qiita 設定

```javascript
"qiita.com": {
  id: "qiita-custom",
  match: {
    hostname: "qiita.com",  // qiita.com ドメイン
    pathPattern: null,      // 全パス有効（記事・ユーザーページ等）
  },
  // ...
}
```

### よくあるパスパターン

- `null`: 全パスで有効
- `"^/articles/"`: `/articles/` で始まるパス
- `"^/blog/\\d+/"`: `/blog/123/` のような数字 ID
- `"^/[^/]+/[^/]+/?$"`: `/user/repo/` 形式（GitHub リポジトリ等）

## 📋 手順

### 1. ルール定義ファイルの編集

`audicle/content-extract/rules.js` の `SITE_SPECIFIC_RULES` に新しいルールを追加：

```javascript
const SITE_SPECIFIC_RULES = {
  // 既存のルール...

  "example.com": {
    // ← ドメイン名をキーにする（重要！）
    id: "example-custom",
    name: "Example.com記事抽出",
    type: "site-specific",
    priority: 1000,
    description: "example.com用カスタム抽出ルール",

    // URL マッチ条件の詳細設定
    match: {
      hostname: "example.com", // 対象ドメイン
      pathPattern: null, // 全パスにマッチ（特定パスのみにしたい場合は正規表現）
      // pathPattern: "^/articles/",  // 例: /articles/ 配下のみ
    },

    // 抽出戦略
    extractStrategy: {
      // メインコンテナの特定（優先順）
      containerSelectors: ["article .content", ".post-body", "main"],

      // 抽出対象要素（優先順）
      contentSelectors: [
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul > li",
        "ol > li",
        "blockquote",
      ],

      // 除外要素（広告など）
      excludeSelectors: [".ad", ".advertisement", ".sidebar"],

      // 最小テキスト長
      minTextLength: 3,
    },
  },
};
```

**🎯 URL 設定のポイント**:

- **オブジェクトのキー**: `"example.com"` がドメイン名と一致する必要があります
- **match.hostname**: 同じドメイン名を指定
- **match.pathPattern**:
  - `null` = 全パスで有効
  - `"^/articles/"` = `/articles/` 配下のみ
  - `"^/blog/\\d+/"` = `/blog/123/` のような数字 ID のみ

### 2. セレクターの特定方法

1. **対象サイトを Chrome で開く**
2. **Developer Tools (F12) で要素を検査**
3. **本文部分の CSS セレクターを特定**
4. **Console で動作確認**:

```javascript
// セレクターのテスト
document.querySelectorAll("your-selector-here");
```

### 3. 優先度の設定

- `priority: 1000` - サイト固有ルール（最優先）
- `priority: 500` - 汎用ルール
- `priority: 100` - フォールバックルール

### 4. ルールの動作確認

1. **拡張機能のリロード**: `chrome://extensions/` で Audicle 拡張機能を更新
2. **対象サイトでテスト**: ページを開いて Console を確認
3. **ルール採用状況の確認**: Console に自動表示される `[📋 Current Page Rule]` ログを確認

### 5. よく使用される CSS セレクターのパターン

- **記事サイト**: `article p, .post-content p, .entry-content p`
- **ブログ**: `main p, .content p, .post-body p`
- **ニュースサイト**: `.article-body p, .story-content p`
- **技術サイト**: `.markdown-body p, .article-content p`

### 6. デバッグのヒント

- **Console ログ確認**: `[🎯 Extraction Result]` でどのルールが採用されたかを確認
- **抽出結果の検証**: `getCurrentPageRuleInfo()` を Console で実行
- **複数ルール競合時**: `priority` の値で採用優先度が決定される

## ❓ よくある質問（FAQ）

### Q1: `qiita.com` のルールはどうやって動作するの？

A: Audicle は以下の流れで動作します：

1. `https://qiita.com/user/items/abc123` を開く
2. `window.location.hostname` で `qiita.com` を取得
3. `SITE_SPECIFIC_RULES["qiita.com"]` のルールを発見
4. `qiita-custom` ルールを適用して抽出実行

### Q2: サブドメインは別設定が必要？

A: はい。`blog.example.com` と `example.com` は別ドメインとして扱われます：

```javascript
// 別々に設定が必要
"example.com": { /* メインサイト用 */ },
"blog.example.com": { /* ブログ用 */ },
```

### Q3: 複数ドメインで同じルールを使いたい場合は？

A: 現在は各ドメインごとに個別設定が必要です：

```javascript
"site1.com": {
  id: "news-sites",
  // ... 設定
},
"site2.com": {
  id: "news-sites-2", // 別のIDが必要
  // ... 同じ設定をコピー
},
```

### Q4: ルールが適用されないときは？

A: 以下を確認してください：

1. **ドメイン名の正確性**: `SITE_SPECIFIC_RULES` のキーが正確か
2. **Console 確認**: `[ExtractionRules]` ログを確認
3. **拡張機能リロード**: `chrome://extensions/` でリロード済みか
4. **セレクター確認**: 対象要素が実際に存在するか

## 🚨 注意事項

- **priority 値の重複**を避け、既存ルールとの競合を防ぐ
- **セレクターの精度**を確認し、不要な要素を含めない
- **テスト**を十分に行い、意図しない動作がないことを確認
- **コメント**でルールの意図を明記し、保守性を向上させる

## ✅ チェックリスト

- [ ] `rules.js` にルール定義を追加した
- [ ] セレクターを Console でテストした
- [ ] priority を適切に設定した
- [ ] 拡張機能をリロードした
- [ ] 対象サイトで動作を確認した
- [ ] Console ログを確認した
- [ ] 既存サイトに影響がないことを確認した

---

**詳細な情報**: プロジェクトルートの `README.md` の「開発者向け - 新サイト対応ルール追加手順」セクションも参照してください。
