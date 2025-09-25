const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const fetch = require("node-fetch");

async function extractContent(url) {
  try {
    // URLからHTMLを取得
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // JSDOMでHTMLをパース
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Readabilityで本文抽出
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to extract content");
    }

    // テキストを段落ごとに分割（簡易版）
    const chunks = article.textContent
      .split(/\n\s*\n/) // 空行で分割
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 10) // 短すぎるチャンクを除外
      .slice(0, 50); // 最大50チャンクに制限

    const result = {
      title: article.title || "",
      chunks: chunks,
    };

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

// コマンドライン引数からURLを取得
const url = process.argv[2];
if (!url) {
  console.error(JSON.stringify({ error: "URL is required" }));
  process.exit(1);
}

extractContent(url);
