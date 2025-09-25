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

// テキスト分割設定
const CHUNK_SIZE = 200; // 200文字ごとに分割（0にすると分割なし）

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

      // 自動スクロール: 要素が画面に見えるようにスクロール
      try {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center", // 画面中央に配置
          inline: "nearest",
        });
        console.log(
          "updateHighlight: Auto-scrolled to paragraphId:",
          paragraphId
        );
      } catch (error) {
        console.warn("updateHighlight: ScrollIntoView failed:", error);
        // フォールバック: 古いブラウザ向け
        element.scrollIntoView(true);
      }
    } else {
      console.warn(
        "updateHighlight: Element not found for paragraphId:",
        paragraphId
      );
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
      console.log(
        "handleClick: Searching for paragraphId:",
        clickedId,
        "in queue of",
        playbackQueue.length,
        "items"
      );

      // 同じparagraphIdを持つ複数のチャンクがある場合、現在位置から最も近いものを選択
      let bestIndex = -1;
      let bestDistance = Infinity;

      playbackQueue.forEach((item, index) => {
        if (item.paragraphId === clickedId) {
          const distance = Math.abs(index - queueIndex);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        }
      });

      if (bestIndex !== -1) {
        console.log(
          "handleClick: Found at index:",
          bestIndex,
          "for ID:",
          clickedId,
          "current queueIndex:",
          queueIndex,
          "distance:",
          bestDistance
        );
        queueIndex = bestIndex;
        // 現在の再生を停止し、新しい位置から再生
        audioPlayer.pause();
        // ハイライトを即座に更新
        updateHighlight(clickedId);

        // 新しい位置から必要な音声を段階的に読み込み
        const JUMP_BATCH_SIZE = 3;
        const jumpBatch = [];

        for (
          let i = bestIndex;
          i < Math.min(bestIndex + JUMP_BATCH_SIZE, playbackQueue.length);
          i++
        ) {
          if (!audioCache.has(i)) {
            const item = playbackQueue[i];
            if (item && item.text) {
              jumpBatch.push({ index: i, text: item.text });
            }
          }
        }

        if (jumpBatch.length > 0) {
          console.log(
            `handleClick: Fetching ${jumpBatch.length} items from jump position`
          );
          chrome.runtime.sendMessage(
            { command: "fullBatchFetch", batch: jumpBatch },
            (response) => {
              if (response && response.audioDataUrls) {
                response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
                  audioCache.set(index, audioDataUrl);
                });
              }
              playQueue();
              // バックグラウンドで残りを読み込み
              fetchRemainingInBackground(bestIndex + JUMP_BATCH_SIZE);
            }
          );
        } else {
          playQueue();
          // バックグラウンドで残りを読み込み
          fetchRemainingInBackground(bestIndex + JUMP_BATCH_SIZE);
        }
      } else {
        console.warn(
          "handleClick: ID",
          clickedId,
          "not found in current queue"
        );
        // デバッグ: キューの最初の5項目を表示
        console.log(
          "Queue sample:",
          playbackQueue.slice(0, 5).map((item) => ({
            id: item.paragraphId,
            text: item.text.substring(0, 20),
          }))
        );
      }
    } else {
      console.warn(
        "handleClick: Invalid clicked ID:",
        target.dataset.audicleId
      );
    }
    return;
  }

  // 再生中でない場合、新しいルール管理システムを使用してキュー構築
  let queue = [];
  let extractionInfo = null; // 可観測性用

  try {
    // 新しいルール管理システムを優先使用
    if (window.ExtractionRulesManager) {
      console.log("handleClick: Using new integrated rules system");
      const result = buildQueueWithNewRulesManager();
      queue = result.queue;
      extractionInfo = result.info;
    } else {
      console.warn("handleClick: New rules system not available, using legacy");
      const result = buildQueueWithLegacySystem();
      queue = result.queue;
      extractionInfo = result.info;
    }
  } catch (error) {
    console.error("New rules system failed, falling back to legacy:", error);
    try {
      const result = buildQueueWithLegacySystem();
      queue = result.queue;
      extractionInfo = result.info;
      extractionInfo.fallbackReason = error.message;
    } catch (legacyError) {
      console.error("Legacy system also failed:", legacyError);
      queue = buildQueueWithFallback();
      extractionInfo = {
        rule: "emergency-fallback",
        error: legacyError.message,
      };
    }
  }

  // 可観測性: 採用されたルール情報をログ出力
  if (extractionInfo) {
    console.log(
      `[🎯 Extraction Result] Rule: ${extractionInfo.rule}, Blocks: ${
        extractionInfo.queueLength || queue.length
      }, Domain: ${extractionInfo.domain}`
    );
    if (extractionInfo.priority) {
      console.log(
        `[📊 Rule Info] Priority: ${extractionInfo.priority}, Type: ${extractionInfo.type}`
      );
    }
    if (extractionInfo.fallbackReason) {
      console.log(`[⚠️  Fallback] Reason: ${extractionInfo.fallbackReason}`);
    }
  }

  console.log("handleClick: Built queue length:", queue.length);

  // キューが構築できた場合は再生開始
  if (queue.length > 0) {
    playbackQueue = queue;
    const clickedId = parseInt(target.dataset.audicleId);
    if (!isNaN(clickedId)) {
      // 同じparagraphIdを持つ複数のチャンクがある場合、最初のものを選択
      let startIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].paragraphId === clickedId) {
          startIndex = i;
          break;
        }
      }

      if (startIndex !== -1) {
        queueIndex = startIndex;
        console.log(
          "handleClick: Starting at index:",
          startIndex,
          "for ID:",
          clickedId,
          "first chunk of this paragraph"
        );
      } else {
        queueIndex = 0;
        console.warn("handleClick: ID not found in queue, starting at 0");
      }
    } else {
      queueIndex = 0;
      console.warn("handleClick: No valid ID, starting at 0");
    }
    // 段階的読み込みで再生開始
    progressiveFetch(() => playQueue());
  } else {
    console.error("handleClick: No queue built");
  }
}

// 新しいルール管理システムを使用したキュー構築（統合版）
function buildQueueWithNewRulesManager() {
  console.log("[NewRulesManager] Building queue with integrated rules system");

  const manager = new window.ExtractionRulesManager();
  const hostname = window.location.hostname;
  const url = window.location.href;

  // まず適用可能なルールを見つける
  const rule = manager.findBestRule(hostname, url);
  if (!rule) {
    throw new Error("No applicable rule found for this page");
  }

  console.log(
    `[NewRulesManager] Using rule: ${rule.id} (${rule.type}, priority: ${rule.priority})`
  );

  // ルールを使って抽出実行
  const extraction = manager.extractContent(rule);

  if (!extraction || extraction.length === 0) {
    throw new Error(`Rule ${rule.id} failed to extract content`);
  }

  // 抽出されたブロックを200文字分割キューに変換
  const queue = [];

  extraction.forEach((item, blockIndex) => {
    const element = item.element;
    const text = item.text;
    const paragraphId = item.id || blockIndex;

    // デバッグ: 要素の処理順序を確認
    const tagName = element ? element.tagName.toLowerCase() : "unknown";
    const textPreview = text ? text.substring(0, 30) + "..." : "no text";
    console.log(
      `[NewRulesManager] Processing block ${blockIndex}: ${tagName} (id: ${paragraphId}) - "${textPreview}"`
    );

    // 要素にIDとクラスを設定（ハイライト用）
    if (element) {
      element.dataset.audicleId = paragraphId;
      element.classList.add("audicle-clickable");
    }

    // 200文字ごとに分割して音声キューに追加
    if (text && text.length > 0) {
      if (CHUNK_SIZE > 0) {
        // チャンク分割を行う場合
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
          const chunk = text.slice(i, i + CHUNK_SIZE).trim();
          if (chunk) {
            queue.push({
              text: chunk,
              paragraphId: paragraphId,
              blockIndex: blockIndex,
              element: element,
              status: "ready",
            });
          }
        }
      } else {
        // チャンク分割なし：段落全体を1つのアイテムとして追加
        queue.push({
          text: text.trim(),
          paragraphId: paragraphId,
          blockIndex: blockIndex,
          element: element,
          status: "ready",
        });
      }
    }
  });

  const info = {
    rule: rule.id,
    priority: rule.priority,
    type: rule.type,
    domain: hostname,
    queueLength: queue.length,
  };

  console.log(
    `[NewRulesManager] Successfully built queue: ${queue.length} chunks from ${extraction.length} blocks using rule '${rule.id}'`
  );

  return { queue, info };
}

// レガシーシステムを使用したキュー構築
function buildQueueWithLegacySystem() {
  console.log("[LegacySystem] Building queue with legacy rules system");

  const hostname = window.location.hostname;
  let queue = [];
  let info = { rule: "unknown", domain: hostname };

  if (customRules[hostname]) {
    console.log("[LegacySystem] Using custom rule for", hostname);
    queue = buildQueueWithCustomRule(customRules[hostname]);
    info.rule = "custom-" + hostname;
    info.type = "site-specific";
  }

  if (queue.length === 0) {
    try {
      console.log("[LegacySystem] Trying Readability extraction");
      queue = buildQueueWithReadability();
      info.rule = "readability";
      info.type = "library";
    } catch (e) {
      console.error("Readability extraction failed:", e);
    }
  }

  if (queue.length === 0) {
    console.log("[LegacySystem] Using fallback extraction");
    queue = buildQueueWithFallback();
    info.rule = "fallback";
    info.type = "emergency";
  }

  info.queueLength = queue.length;
  console.log(
    `[LegacySystem] Built queue: ${queue.length} items using rule '${info.rule}'`
  );

  return { queue, info };
}

// 現在のページで使用可能なルール情報を取得
function getCurrentPageRuleInfo() {
  const hostname = window.location.hostname;
  const url = window.location.href;

  let ruleInfo = {
    hostname,
    url,
    availableRules: [],
  };

  // 新しいルール管理システムでの情報取得
  if (window.ExtractionRulesManager) {
    try {
      const manager = new window.ExtractionRulesManager();
      const matchedRule = manager.findBestRule(hostname, url);
      if (matchedRule) {
        ruleInfo.activeRule = {
          id: matchedRule.id,
          priority: matchedRule.priority,
          type: matchedRule.type,
          system: "new",
        };
      }
    } catch (error) {
      console.warn("[getCurrentPageRuleInfo] New rules manager error:", error);
    }
  }

  // レガシールールでの情報
  if (customRules[hostname]) {
    ruleInfo.legacyRule = {
      id: "legacy-" + hostname,
      type: "site-specific-legacy",
      system: "legacy",
    };
  }

  // Readability利用可能性
  ruleInfo.readabilityAvailable = typeof window.Readability !== "undefined";

  console.log("[\ud83d\udd0d Page Rule Info]", ruleInfo);
  return ruleInfo;
}

// 即座にグローバル公開（関数定義直後）
if (typeof window !== "undefined") {
  window.getCurrentPageRuleInfo = getCurrentPageRuleInfo;
}

// 初期化時に現在のページのルール情報を表示
document.addEventListener("DOMContentLoaded", () => {
  // グローバル関数として公開（確実に実行されるタイミング）
  window.getCurrentPageRuleInfo = getCurrentPageRuleInfo;

  // システム状態をログ出力
  console.log("[🚀 Audicle Initialized]");
  console.log(
    "- New Rules Manager:",
    window.ExtractionRulesManager ? "✅ Available" : "❌ Not loaded"
  );
  console.log(
    "- Legacy Rules:",
    Object.keys(customRules).length,
    "site-specific rules"
  );
  console.log(
    "- Readability.js:",
    window.Readability ? "✅ Available" : "⏳ Will load dynamically"
  );

  // 現在のページで採用されるルール情報を自動表示
  setTimeout(() => {
    const ruleInfo = getCurrentPageRuleInfo();

    if (ruleInfo.activeRule) {
      console.log(
        `[📋 Current Page Rule] ${ruleInfo.activeRule.id} (${ruleInfo.activeRule.system} system, priority: ${ruleInfo.activeRule.priority})`
      );
    } else if (ruleInfo.legacyRule) {
      console.log(
        `[📋 Current Page Rule] ${ruleInfo.legacyRule.id} (legacy system)`
      );
    } else if (ruleInfo.readabilityAvailable) {
      console.log("[📋 Current Page Rule] Readability.js (fallback)");
    } else {
      console.log(
        "[📋 Current Page Rule] Emergency fallback (basic text extraction)"
      );
    }

    console.log(`[🌐 Page Info] ${ruleInfo.hostname}`);
  }, 500);
});

// レガシーシステムでのキュー構築（既存動作保護）
function buildQueueWithLegacySystem() {
  console.log("[LegacySystem] Using legacy extraction system");

  const hostname = window.location.hostname;
  let queue = [];
  let usedRule = "none";

  // 既存のカスタムルール
  if (customRules[hostname]) {
    console.log(`[LegacySystem] Using custom rule for ${hostname}`);
    queue = buildQueueWithCustomRule(customRules[hostname]);
    usedRule = `custom-${hostname}`;
  }

  // Readability.js
  if (queue.length === 0) {
    try {
      console.log("[LegacySystem] Trying Readability extraction");
      queue = buildQueueWithReadability();
      usedRule = "readability";
    } catch (e) {
      console.warn("Readability extraction failed:", e);
    }
  }

  // フォールバック
  if (queue.length === 0) {
    console.log("[LegacySystem] Using fallback extraction");
    queue = buildQueueWithFallback();
    usedRule = "fallback";
  }

  return {
    queue: queue,
    info: {
      rule: usedRule,
      type: "legacy",
      priority: "unknown",
      queueLength: queue.length,
      domain: hostname,
    },
  };
}

// 新しいルールマネージャーを使用したキュー構築
function buildQueueWithRulesManager() {
  console.log("[RulesManager] Building queue with new rules manager");

  // ルールマネージャーのインスタンスを作成
  const rulesManager = new window.ExtractionRulesManager();

  // 適用可能なルールを取得
  const applicableRules = rulesManager.getApplicableRules();
  console.log(
    "[RulesManager] Found applicable rules:",
    applicableRules.map((r) => `${r.name} (priority: ${r.priority})`)
  );

  // 優先順位に従って順次試行
  for (const rule of applicableRules) {
    try {
      console.log(`[RulesManager] Trying rule: ${rule.name}`);

      // Readabilityライブラリが必要な場合は事前に注入
      if (rule.extractStrategy.requiresLibrary) {
        injectReadabilityLib();
        // ライブラリの読み込み待ち（簡易チェック）
        if (typeof Readability === "undefined") {
          console.warn(
            `[RulesManager] ${rule.name} requires Readability library but not available`
          );
          continue;
        }
      }

      const blocks = rulesManager.extractContent(rule);

      if (blocks && blocks.length > 0) {
        console.log(
          `[RulesManager] ✅ Successfully extracted ${blocks.length} blocks with rule: ${rule.name}`
        );

        // 既存の形式に変換してキューを構築
        return convertBlocksToQueue(blocks);
      }
    } catch (error) {
      console.warn(`[RulesManager] Rule ${rule.name} failed:`, error.message);
      continue;
    }
  }

  console.error("[RulesManager] All rules failed");
  return [];
}

// 新しいブロック形式を既存のキュー形式に変換
function convertBlocksToQueue(blocks) {
  console.log(
    `[RulesManager] Converting ${blocks.length} blocks to queue format`
  );

  const queue = [];

  blocks.forEach((block, index) => {
    // 各ブロックのテキストを200文字ごとに分割
    const chunkSize = 200;
    const text = block.text;

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize).trim();
      if (chunk) {
        queue.push({
          text: chunk,
          paragraphId: block.id,
        });
      }
    }

    // 要素にIDとクラスを設定（ハイライト用）
    if (block.element) {
      block.element.dataset.audicleId = block.id;
      block.element.classList.add("audicle-clickable");
    }
  });

  console.log(`[RulesManager] Converted to ${queue.length} queue chunks`);
  return queue;
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
// 段階的フェッチ: 最初の数個を読み込んで即座に再生開始
function progressiveFetch(callback) {
  const INITIAL_BATCH_SIZE = 5; // 最初に読み込む数

  // 最初のバッチ（開始位置から5個）を準備
  const initialBatch = [];
  const startIndex = queueIndex;

  for (
    let i = startIndex;
    i < Math.min(startIndex + INITIAL_BATCH_SIZE, playbackQueue.length);
    i++
  ) {
    if (!audioCache.has(i)) {
      const item = playbackQueue[i];
      if (item && item.text) {
        initialBatch.push({ index: i, text: item.text });
      }
    }
  }

  if (initialBatch.length === 0) {
    console.log(
      "progressiveFetch: Initial batch already cached, starting playback"
    );
    callback();
    // バックグラウンドで残りを読み込み
    fetchRemainingInBackground(startIndex + INITIAL_BATCH_SIZE);
    return;
  }

  console.log(
    `progressiveFetch: Fetching initial batch of ${initialBatch.length} items for immediate playback`
  );

  // 最初のバッチを取得
  chrome.runtime.sendMessage(
    { command: "fullBatchFetch", batch: initialBatch },
    (response) => {
      if (response && response.audioDataUrls) {
        console.log(
          "progressiveFetch: Received",
          response.audioDataUrls.length,
          "initial audio URLs"
        );
        response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
          audioCache.set(index, audioDataUrl);
          console.log(
            "progressiveFetch: Cached initial audio for index:",
            index
          );
        });
        console.log("progressiveFetch: Initial batch ready, starting playback");
      } else {
        console.error("progressiveFetch: No response for initial batch");
      }

      // 再生開始
      callback();

      // バックグラウンドで残りを読み込み
      fetchRemainingInBackground(startIndex + INITIAL_BATCH_SIZE);
    }
  );
}

// バックグラウンドで残りの音声を読み込み（前後両方向）
function fetchRemainingInBackground(priorityStartIndex) {
  // 前方向（未来）と後方向（過去）に分けて収集
  const forwardBatch = []; // クリック位置より後ろ（優先）
  const backwardBatch = []; // クリック位置より前（後回し）

  // 前方向（priorityStartIndex以降）を収集
  for (let i = priorityStartIndex; i < playbackQueue.length; i++) {
    if (!audioCache.has(i)) {
      const item = playbackQueue[i];
      if (item && item.text) {
        forwardBatch.push({ index: i, text: item.text });
      }
    }
  }

  // 後方向（queueIndexより前）を収集
  for (let i = 0; i < queueIndex; i++) {
    if (!audioCache.has(i)) {
      const item = playbackQueue[i];
      if (item && item.text) {
        backwardBatch.push({ index: i, text: item.text });
      }
    }
  }

  console.log(
    `fetchRemainingInBackground: Forward: ${forwardBatch.length} items, Backward: ${backwardBatch.length} items`
  );

  // 前方向を最優先で読み込み
  if (forwardBatch.length > 0) {
    fetchBatchInChunks(forwardBatch, "forward", 0);
  }

  // 後方向は少し遅延させて読み込み
  if (backwardBatch.length > 0) {
    setTimeout(() => {
      fetchBatchInChunks(backwardBatch, "backward", 2000); // 2秒遅延
    }, 1000);
  }
}

// バッチを小さなチャンクに分割して順次取得
function fetchBatchInChunks(batch, direction, initialDelay = 0) {
  const BACKGROUND_BATCH_SIZE = 8; // 少し小さく調整

  for (let i = 0; i < batch.length; i += BACKGROUND_BATCH_SIZE) {
    const chunk = batch.slice(i, i + BACKGROUND_BATCH_SIZE);

    setTimeout(() => {
      console.log(
        `fetchBatchInChunks: Fetching ${direction} chunk ${
          Math.floor(i / BACKGROUND_BATCH_SIZE) + 1
        } (${chunk.length} items)`
      );
      chrome.runtime.sendMessage(
        { command: "fullBatchFetch", batch: chunk },
        (response) => {
          if (response && response.audioDataUrls) {
            response.audioDataUrls.forEach(({ index, audioDataUrl }) => {
              audioCache.set(index, audioDataUrl);
              console.log(
                `fetchBatchInChunks: Cached ${direction} audio for index:`,
                index
              );
            });
          }
        }
      );
    }, initialDelay + i * 600); // 600ms間隔（少し短縮）
  }
}

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
