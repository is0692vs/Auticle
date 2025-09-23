// content.js
let audioPlayer = new Audio();
let isClickAttached = false;
let isEnabled = false;

// 再生中かどうかを追跡
let isPlaying = false;

// 再生キュー（{text, paragraphId} の配列）と現在のキュー位置
let playbackQueue = [];
let queueIndex = 0;
// prefetch cache: queueIndex -> audioDataUrl
let audioCache = new Map();
// 先読みするチャンク数
const PREFETCH_AHEAD = 2;

// リトライカウンター
let retryCount = 0;
const MAX_RETRIES = 2;

// バッチサイズ
const BATCH_SIZE = 3;

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
    isPlaying = true;
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
  }

  // 音声合成エラー処理
  if (message.command === "audioError") {
    console.error("音声合成エラー:", message.error);
    isPlaying = false;
  }
});

// popup.jsからのメッセージを待つ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "togglePauseResume") {
    if (isPlaying) {
      // 一時停止
      audioPlayer.pause();
      isPlaying = false;
      console.log("Playback paused");
      sendResponse({ isPlaying: false });
    } else if (playbackQueue.length > 0) {
      // 再開
      playQueue();
      console.log("Playback resumed");
      sendResponse({ isPlaying: true });
    } else {
      sendResponse({ isPlaying: false });
    }
  }
});

// audio の再生終了を受け取り、キューの次へ進める
audioPlayer.addEventListener("ended", () => {
  console.log(
    "Audio ended, current queueIndex:",
    queueIndex,
    "queue length:",
    playbackQueue.length
  );
  retryCount = 0; // リトライカウンターをリセット
  queueIndex += 1;
  if (queueIndex < playbackQueue.length) {
    console.log("Moving to next item, new queueIndex:", queueIndex);
    playQueue();
  } else {
    console.log("Queue finished");
    isPlaying = false;
    // キュー終了時にハイライト解除
    updateHighlight(null);
    playbackQueue = [];
    queueIndex = 0;
  }
});

// audio のエラーを処理
audioPlayer.addEventListener("error", (e) => {
  console.error("Audio error:", e);
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(
      `Retrying playback for index ${queueIndex}, attempt ${retryCount}`
    );
    setTimeout(() => playQueue(), 3000); // 3秒遅延してリトライ
  } else {
    console.log(`Max retries reached for index ${queueIndex}, skipping`);
    retryCount = 0;
    isPlaying = false;
    queueIndex += 1;
    if (queueIndex < playbackQueue.length) {
      playQueue();
    } else {
      updateHighlight(null);
      playbackQueue = [];
      queueIndex = 0;
    }
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
    const container = document.querySelector(
      "#personal-public-article-body .mdContent-inner"
    );
    if (container) {
      const allElements = container.querySelectorAll("*");
      let paragraphId = 0;
      allElements.forEach((el) => {
        const tagName = el.tagName.toLowerCase();
        const text = (el.textContent || "").trim();
        if (
          text &&
          (tagName === "p" ||
            (tagName === "li" && el.closest("ul")) ||
            (tagName === "li" && el.closest("ol")) ||
            tagName === "h1" ||
            tagName === "h2" ||
            tagName === "h3" ||
            tagName === "h4" ||
            tagName === "h5" ||
            tagName === "h6" ||
            tagName === "blockquote" ||
            tagName === "pre")
        ) {
          el.dataset.audicleId = paragraphId;
          el.classList.add("audicle-clickable");
          paragraphId++;
        }
      });
    }
  } else {
    // フォールバック
    const selectors = "article p, main p, .post-body p, .entry-content p";
    const paragraphs = document.querySelectorAll(selectors);
    paragraphs.forEach((p, index) => {
      p.dataset.audicleId = index;
      p.classList.add("audicle-clickable");
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
  isPlaying = false;
  const paragraphs = document.querySelectorAll(".audicle-clickable");
  paragraphs.forEach((p) => {
    p.classList.remove("audicle-clickable");
    delete p.dataset.audicleId;
  });
  if (isClickAttached) {
    document.removeEventListener("click", handleClick, true);
    isClickAttached = false;
  }
  removeStyles();
  // 再生キューのリセット
  playbackQueue = [];
  queueIndex = 0;
  // audioCacheはクリアせず残す（一時停止用）
  retryCount = 0;
}

// ハイライトを更新する関数
function updateHighlight(paragraphId) {
  // 既存のハイライトを解除
  const currentHighlight = document.querySelector(".audicle-highlight");
  if (currentHighlight) {
    currentHighlight.classList.remove("audicle-highlight");
  }
  // 新しいハイライトを設定
  if (paragraphId !== null) {
    const element = document.querySelector(
      `[data-audicle-id="${paragraphId}"]`
    );
    if (element) {
      element.classList.add("audicle-highlight");
    }
  }
}

function handleClick(event) {
  const target = event.target.closest(".audicle-clickable");
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();

  console.log(
    "handleClick: Clicked element:",
    target,
    "ID:",
    target.dataset.audicleId,
    "isPlaying:",
    isPlaying
  );

  // 再生中の場合、位置変更のみ
  if (isPlaying && playbackQueue.length > 0) {
    const clickedId = parseInt(target.dataset.audicleId);
    if (!isNaN(clickedId)) {
      const startIndex = playbackQueue.findIndex(
        (item) => item.paragraphId === clickedId
      );
      if (startIndex !== -1) {
        queueIndex = startIndex;
        console.log(
          "handleClick: Jumping to index:",
          startIndex,
          "for ID:",
          clickedId
        );
        // 現在の再生を停止し、新しい位置から再生
        audioPlayer.pause();
        playQueue();
      } else {
        console.warn("handleClick: ID not found in current queue");
      }
    }
    return;
  }

  // 再生中でない場合、キュー構築
  const hostname = window.location.hostname;

  let queue = [];
  if (customRules[hostname]) {
    queue = buildQueueWithCustomRule(customRules[hostname]);
  }

  if (queue.length === 0) {
    try {
      queue = buildQueueWithReadability();
    } catch (e) {
      console.error("Readability extraction failed:", e);
    }
  }

  if (queue.length === 0) {
    queue = buildQueueWithFallback();
  }

  console.log("handleClick: Built queue length:", queue.length);

  if (queue.length > 0) {
    playbackQueue = queue;
    const clickedId = parseInt(target.dataset.audicleId);
    if (!isNaN(clickedId)) {
      const startIndex = queue.findIndex(
        (item) => item.paragraphId === clickedId
      );
      if (startIndex !== -1) {
        queueIndex = startIndex;
        console.log(
          "handleClick: Starting at index:",
          startIndex,
          "for ID:",
          clickedId
        );
      } else {
        queueIndex = 0;
        console.warn("handleClick: ID not found in queue, starting at 0");
      }
    } else {
      queueIndex = 0;
      console.warn("handleClick: No valid ID, starting at 0");
    }
    // 全キューを一括フェッチしてから再生開始
    fullBatchFetch(() => playQueue());
  } else {
    console.error("handleClick: No queue built");
  }
}

// 独自ルールでキューを構築
function buildQueueWithCustomRule(rule) {
  const container = document.querySelector(
    "#personal-public-article-body .mdContent-inner"
  );
  if (!container) {
    console.warn("buildQueueWithCustomRule: Container not found");
    return [];
  }

  const allElements = container.querySelectorAll("*");
  const queue = [];
  let paragraphId = 0;

  console.log(
    "buildQueueWithCustomRule: Processing",
    allElements.length,
    "elements"
  );

  allElements.forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    const text = (el.textContent || "").trim();
    if (
      text &&
      (tagName === "p" ||
        (tagName === "li" && el.closest("ul")) ||
        (tagName === "li" && el.closest("ol")) ||
        tagName === "h1" ||
        tagName === "h2" ||
        tagName === "h3" ||
        tagName === "h4" ||
        tagName === "h5" ||
        tagName === "h6" ||
        tagName === "blockquote" ||
        tagName === "pre")
    ) {
      el.dataset.audicleId = paragraphId;
      el.classList.add("audicle-clickable");
      console.log(
        "buildQueueWithCustomRule: Added element",
        tagName,
        "ID:",
        paragraphId,
        "text length:",
        text.length
      );
      // 200文字ごとに分割
      const chunkSize = 200;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        queue.push({ text: chunk, paragraphId });
      }
      paragraphId++;
    }
  });

  console.log(
    "buildQueueWithCustomRule: Built queue with",
    queue.length,
    "chunks"
  );
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
      const paragraphId = parseInt(p.dataset.audicleId);
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
  if (!(queueIndex >= 0 && queueIndex < playbackQueue.length)) {
    console.warn(
      "playQueue: Invalid queueIndex:",
      queueIndex,
      "queue length:",
      playbackQueue.length
    );
    return;
  }
  const item = playbackQueue[queueIndex];
  if (!item || !item.text) {
    console.warn("playQueue: Invalid item at index:", queueIndex, item);
    return;
  }

  console.log(
    "playQueue: Playing item at index:",
    queueIndex,
    "text length:",
    item.text.length,
    "paragraphId:",
    item.paragraphId,
    "text:",
    item.text
  );

  // リトライカウンターはリセットしない（リトライ時は維持）

  // 現在の段落をハイライト
  updateHighlight(item.paragraphId);

  // まずキャッシュをチェック。あれば即座に再生、なければ通常の play 要求を送る
  const cached = audioCache.get(queueIndex);
  if (cached) {
    console.log("playQueue: Using cached audio for index:", queueIndex);
    isPlaying = true;
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
    console.log(
      "playQueue: No cached audio for index:",
      queueIndex,
      "Cache size:",
      audioCache.size
    );
    // 全フェッチ済みのはずなので、エラー扱い
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      console.log("playQueue: Retrying in 3s, attempt:", retryCount);
      setTimeout(() => playQueue(), 3000);
    } else {
      console.log(
        `playQueue: Max retries reached for index ${queueIndex}, skipping`
      );
      retryCount = 0;
      isPlaying = false;
      queueIndex += 1;
      if (queueIndex < playbackQueue.length) {
        playQueue();
      } else {
        updateHighlight(null);
        playbackQueue = [];
        queueIndex = 0;
      }
    }
  }

  // 次の N 個を非同期でプリフェッチ（バッチで）
  prefetchBatch(queueIndex + 1);
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
    setTimeout(() => {
      chrome.runtime.sendMessage(
        { command: "fetch", text: item.text },
        (response) => {
          if (response && response.audioDataUrl) {
            audioCache.set(i, response.audioDataUrl);
          }
        }
      );
    }, (i - startIndex) * 1000); // 各リクエストに1秒間隔
  }
}

// バッチでフェッチ
function fetchBatch(startIndex) {
  const batch = [];
  for (
    let i = startIndex;
    i < Math.min(playbackQueue.length, startIndex + BATCH_SIZE);
    i++
  ) {
    if (!audioCache.has(i)) {
      const item = playbackQueue[i];
      if (item && item.text) {
        batch.push({ index: i, text: item.text });
      }
    }
  }
  if (batch.length === 0) {
    // すべてキャッシュ済みなら再生
    playFromCache(startIndex);
    return;
  }
  chrome.runtime.sendMessage({ command: "batchFetch", batch }, (response) => {
    if (response && response.audioDataUrls) {
      response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
        audioCache.set(index, audioDataUrl);
      });
    }
    playFromCache(startIndex);
  });
}

// バッチでプリフェッチ
function prefetchBatch(startIndex) {
  const batch = [];
  for (
    let i = startIndex;
    i <
    Math.min(playbackQueue.length, startIndex + PREFETCH_AHEAD * BATCH_SIZE);
    i += BATCH_SIZE
  ) {
    for (let j = i; j < Math.min(playbackQueue.length, i + BATCH_SIZE); j++) {
      if (!audioCache.has(j)) {
        const item = playbackQueue[j];
        if (item && item.text) {
          batch.push({ index: j, text: item.text });
        }
      }
    }
  }
  if (batch.length > 0) {
    setTimeout(() => {
      chrome.runtime.sendMessage(
        { command: "batchFetch", batch },
        (response) => {
          if (response && response.audioDataUrls) {
            response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
              audioCache.set(index, audioDataUrl);
            });
          }
        }
      );
    }, 1000); // 1秒遅延
  }
}

// 全キューを一括フェッチ
function fullBatchFetch(callback) {
  const batch = [];
  for (let i = 0; i < playbackQueue.length; i++) {
    if (!audioCache.has(i)) {
      const item = playbackQueue[i];
      if (item && item.text) {
        batch.push({ index: i, text: item.text });
      }
    }
  }
  if (batch.length === 0) {
    console.log("fullBatchFetch: All items already cached");
    callback(); // すべてキャッシュ済みなら即再生
    return;
  }
  console.log("fullBatchFetch: Fetching", batch.length, "items in batch");
  chrome.runtime.sendMessage(
    { command: "fullBatchFetch", batch },
    (response) => {
      if (response && response.audioDataUrls) {
        console.log(
          "fullBatchFetch: Received",
          response.audioDataUrls.length,
          "audio URLs"
        );
        response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
          audioCache.set(index, audioDataUrl);
          console.log("fullBatchFetch: Cached audio for index:", index);
        });
        console.log("fullBatchFetch: All audio cached, starting playback");
      } else {
        console.error("fullBatchFetch: No response or audioDataUrls");
      }
      callback();
    }
  );
}

function injectStyles(filePath) {
  if (document.getElementById("audicle-styles")) return;
  const link = document.createElement("link");
  link.id = "audicle-styles";
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL(filePath);
  document.head.appendChild(link);
}

function removeStyles() {
  const link = document.getElementById("audicle-styles");
  if (link) {
    link.remove();
  }
}
