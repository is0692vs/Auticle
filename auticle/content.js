// content.js
let audioPlayer = new Audio();
let isClickAttached = false;
let isEnabled = false;

// 再生キュー（{text, paragraphId} の配列）と現在のキュー位置
let playbackQueue = [];
let queueIndex = 0;
// prefetch cache: queueIndex -> audioDataUrl
let audioCache = new Map();
// 先読みするチャンク数
const PREFETCH_AHEAD = 2;

// ----- Readability 注入 & カスタムルール定義 -----
// ドメインごとの独自抽出ルール（まずは qiita.com のプレースホルダ）
const customRules = {
  "qiita.com": {
    // Qiita の記事構造に合わせた優先セレクタ群。
    // テキスト読み上げでは段落（p）、箇条書きの li、見出し（h1..h6）、引用、コードブロックなどを
    // 順序通りに抽出したい。Qiita の記事本文は `#personal-public-article-body .mdContent-inner` に入る。
    selectors: [
      // まずは記事本文コンテナ内のブロック要素を優先して取得
      "#personal-public-article-body .mdContent-inner > p",
      "#personal-public-article-body .mdContent-inner > ul > li",
      "#personal-public-article-body .mdContent-inner > ol > li",
      "#personal-public-article-body .mdContent-inner > h1",
      "#personal-public-article-body .mdContent-inner > h2",
      "#personal-public-article-body .mdContent-inner > h3",
      "#personal-public-article-body .mdContent-inner > h4",
      "#personal-public-article-body .mdContent-inner > h5",
      "#personal-public-article-body .mdContent-inner > h6",
      "#personal-public-article-body .mdContent-inner > blockquote",
      "#personal-public-article-body .mdContent-inner > pre",
      // 旧クラス名や別バリアントもカバー
      ".it-Article .rendered-body > p",
      ".it-Article .rendered-body li",
      ".rendered-body > p",
      ".article_body > p",
      // 最終フォールバックは article 内の段落・リスト
      "article > p",
      "article > ul > li",
      "article > ol > li",
    ],
  },
};
// ページに Readability ライブラリを注入する（web_accessible_resources に登録済み）
function injectReadabilityLib() {
  try {
    const src = chrome.runtime.getURL("lib/Readability.js");
    // 既に注入済みならスキップ
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.documentElement.appendChild(script);
  } catch (e) {
    console.error("injectReadabilityLib error:", e);
  }
}

// background.jsからの再生命令を待つ
chrome.runtime.onMessage.addListener((message) => {
  if (message.command === "playAudio") {
    // ★★★ これが最終的な修正です ★★★

    // プレーヤーが「再生準備完了(canplay)」になったら一度だけ実行するリスナーを登録
    audioPlayer.addEventListener(
      "canplay",
      () => {
        // 準備が完了したこのタイミングで速度を設定し、再生を開始する
        audioPlayer.playbackRate = 2.0;
        audioPlayer.play();
      },
      { once: true }
    ); // { once: true } でイベントが一度だけ実行されるようにする

    // リスナーを登録してから、音源ソースを設定する
    audioPlayer.src = message.audioDataUrl;
    // ★★★★★★★★★★★★★★★★★★★★★
  }
});

// audio の再生終了を受け取り、キューの次へ進める
audioPlayer.addEventListener("ended", () => {
  queueIndex += 1;
  if (queueIndex < playbackQueue.length) {
    playQueue();
  } else {
    // キュー終了時にハイライト解除
    updateHighlight(null);
    playbackQueue = [];
    queueIndex = 0;
  }
});

// ストレージの変更（主に有効/無効の変更）を監視
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    updatePageState(isEnabled);
  }
});

// ページ読み込み時に一度だけ、現在の状態で初期化
chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  updatePageState(isEnabled);
});

// ページのON/OFF状態を更新するメイン関数
function updatePageState(enabled) {
  if (enabled) {
    preparePage();
  } else {
    cleanupPage();
  }
}

function preparePage() {
  // ドメインを取得
  const hostname = window.location.hostname;
  if (customRules[hostname]) {
    // 独自ルールで要素を準備
    const rule = customRules[hostname];
    let globalId = 0;
    rule.selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.dataset.auticleId = globalId;
        el.classList.add("auticle-clickable");
        globalId++;
      });
    });
  } else {
    // フォールバック
    const selectors = "article p, main p, .post-body p, .entry-content p";
    const paragraphs = document.querySelectorAll(selectors);
    paragraphs.forEach((p, index) => {
      p.dataset.auticleId = index;
      p.classList.add("auticle-clickable");
    });
  }
  if (!isClickAttached) {
    document.addEventListener("click", handleClick, true);
    isClickAttached = true;
  }
  injectStyles("styles.css");
  // Readability ライブラリを注入
  injectReadabilityLib();
}

function cleanupPage() {
  audioPlayer.pause();
  const paragraphs = document.querySelectorAll(".auticle-clickable");
  paragraphs.forEach((p) => {
    p.classList.remove("auticle-clickable");
    delete p.dataset.auticleId;
  });
  if (isClickAttached) {
    document.removeEventListener("click", handleClick, true);
    isClickAttached = false;
  }
  removeStyles();
}

function handleClick(event) {
  const target = event.target.closest(".auticle-clickable");
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();

  // 現在のドメインを取得
  const hostname = window.location.hostname;

  // 優先順位1: 独自ルール
  let queue = [];
  if (customRules[hostname]) {
    queue = buildQueueWithCustomRule(customRules[hostname]);
  }

  // 優先順位2: Readability.js（キューが空の場合）
  if (queue.length === 0) {
    try {
      queue = buildQueueWithReadability();
    } catch (e) {
      console.error("Readability extraction failed:", e);
    }
  }

  // 優先順位3: フォールバック（キューが空の場合）
  if (queue.length === 0) {
    queue = buildQueueWithFallback();
  }

  // キューが得られたら再生開始
  if (queue.length > 0) {
    playbackQueue = queue;
    // クリックされた要素の paragraphId を取得
    const clickedId = parseInt(target.dataset.auticleId);
    if (!isNaN(clickedId)) {
      // クリックされた ID の最初のアイテムのインデックスを探す
      const startIndex = queue.findIndex(
        (item) => item.paragraphId === clickedId
      );
      if (startIndex !== -1) {
        queueIndex = startIndex;
      } else {
        queueIndex = 0;
      }
    } else {
      queueIndex = 0;
    }
    playQueue();
  }
}

// 独自ルールでキューを構築
function buildQueueWithCustomRule(rule) {
  const queue = [];
  rule.selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const text = (el.textContent || "").trim();
      if (text) {
        const paragraphId = parseInt(el.dataset.auticleId);
        // 200文字ごとに分割
        const chunkSize = 200;
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunk = text.slice(i, i + chunkSize);
          queue.push({ text: chunk, paragraphId });
        }
      }
    });
  });

  return queue;
}

// Readability.js でキューを構築
function buildQueueWithReadability() {
  // Readability が利用可能かチェック
  if (typeof Readability === "undefined") {
    throw new Error("Readability is not available");
  }

  const documentClone = document.cloneNode(true);
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article || !article.content) {
    throw new Error("Readability failed to extract content");
  }

  // 抽出した HTML をテキストに変換し、段落に分割
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = article.content;
  const paragraphs = tempDiv.querySelectorAll("p");

  const queue = [];
  paragraphs.forEach((p, index) => {
    const text = (p.textContent || "").trim();
    if (text) {
      // 200文字ごとに分割
      const chunkSize = 200;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        queue.push({ text: chunk, paragraphId: index });
      }
    }
  });

  return queue;
}

// フォールバックでキューを構築（既存の単純セレクタ）
function buildQueueWithFallback() {
  const selectors = "article p, main p, .post-body p, .entry-content p";
  const paragraphs = document.querySelectorAll(selectors);

  const queue = [];
  paragraphs.forEach((p) => {
    const text = (p.textContent || "").trim();
    if (text) {
      const paragraphId = parseInt(p.dataset.auticleId);
      // 200文字ごとに分割
      const chunkSize = 200;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        queue.push({ text: chunk, paragraphId });
      }
    }
  });

  return queue;
}

// 再生キューを再生する
function playQueue() {
  if (!(queueIndex >= 0 && queueIndex < playbackQueue.length)) return;
  const item = playbackQueue[queueIndex];
  if (!item || !item.text) return;

  // 現在の段落をハイライト
  updateHighlight(item.paragraphId);

  // まずキャッシュをチェック。あれば即座に再生、なければ通常の play 要求を送る
  const cached = audioCache.get(queueIndex);
  if (cached) {
    // 既に取得済みの dataUrl をセットして再生
    audioPlayer.addEventListener(
      "canplay",
      () => {
        audioPlayer.playbackRate = 2.0;
        audioPlayer.play();
      },
      { once: true }
    );
    audioPlayer.src = cached;
  } else {
    // 通常の再生要求
    chrome.runtime.sendMessage({ command: "play", text: item.text });
  }

  // 次の N 個を非同期でプリフェッチ
  prefetchNext(queueIndex + 1);
}

// 指定された startIndex 以降で PREFETCH_AHEAD 個を先読みして audioCache に格納
function prefetchNext(startIndex) {
  for (
    let i = startIndex;
    i < Math.min(playbackQueue.length, startIndex + PREFETCH_AHEAD);
    i++
  ) {
    if (audioCache.has(i)) continue;
    const item = playbackQueue[i];
    if (!item || !item.text) continue;
    // background に fetch 要求を送り、sendResponse で audioDataUrl を受け取る
    chrome.runtime.sendMessage(
      { command: "fetch", text: item.text },
      (response) => {
        if (response && response.audioDataUrl) {
          audioCache.set(i, response.audioDataUrl);
        }
      }
    );
  }
}

// 指定した段落IDをハイライト。null なら解除。
function updateHighlight(paragraphId) {
  // 既存ハイライトをすべて削除
  const prev = document.querySelectorAll(".auticle-highlight");
  prev.forEach((el) => el.classList.remove("auticle-highlight"));

  if (paragraphId === null || paragraphId === undefined) return;

  const selector = `[data-auticle-id=\"${paragraphId}\"]`;
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("auticle-highlight");
    // 可能ならスクロールして見える位置にする
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function injectStyles(filePath) {
  if (document.getElementById("auticle-styles")) return;
  const link = document.createElement("link");
  link.id = "auticle-styles";
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL(filePath);
  document.head.appendChild(link);
}

function removeStyles() {
  const link = document.getElementById("auticle-styles");
  if (link) {
    link.remove();
  }
}
