// content.js
let audioPlayer = new Audio();
let isClickAttached = false;
let isEnabled = false;

// 再生キュー（{text, paragraphId} の配列）と現在のキュー位置
let playbackQueue = [];
let queueIndex = 0;

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
  const selectors = "article p, main p, .post-body p, .entry-content p";
  const paragraphs = document.querySelectorAll(selectors);
  paragraphs.forEach((p, index) => {
    p.dataset.auticleId = index;
    p.classList.add("auticle-clickable");
  });
  if (!isClickAttached) {
    document.addEventListener("click", handleClick, true);
    isClickAttached = true;
  }
  injectStyles("styles.css");
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
  const startId = parseInt(target.dataset.auticleId, 10);
  const allParagraphs = Array.from(
    document.querySelectorAll(".auticle-clickable")
  );

  // クリックされた段落以降のテキストを収集し、段落ごとに200文字程度のチャンクに分割してキューに格納
  playbackQueue = [];
  for (let p of allParagraphs) {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId < startId) continue;
    const paragraphText = (p.textContent || "").trim();
    if (!paragraphText) continue;

    // 200文字ごとに分割する（日本語を考慮し単純に slice を使う）
    const chunkSize = 200;
    for (let i = 0; i < paragraphText.length; i += chunkSize) {
      const chunk = paragraphText.slice(i, i + chunkSize);
      playbackQueue.push({ text: chunk, paragraphId: currentId });
    }
  }

  if (playbackQueue.length > 0) {
    queueIndex = 0;
    playQueue();
  }
}

// 再生キューを再生する
function playQueue() {
  if (!(queueIndex >= 0 && queueIndex < playbackQueue.length)) return;
  const item = playbackQueue[queueIndex];
  if (!item || !item.text) return;

  // 現在の段落をハイライト
  updateHighlight(item.paragraphId);

  // background.js に再生依頼を送る
  chrome.runtime.sendMessage({ command: "play", text: item.text });
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
