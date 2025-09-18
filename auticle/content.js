// content.js
let audioPlayer = new Audio();
let isClickAttached = false;
let isEnabled = false;

// --- メッセージリスナー ---
// background.js(音声データ)とpopup.js(速度変更)からの命令を待つ
chrome.runtime.onMessage.addListener((message) => {
  if (message.command === "playAudio") {
    audioPlayer.src = message.audioDataUrl;
    audioPlayer.play();
  } else if (message.command === "changeSpeed") {
    audioPlayer.playbackRate = message.speed;
  }
});

// --- 初期化処理 ---
// 起動時に保存された速度をオーディオプレーヤーに適用
chrome.storage.local.get(["speed"], (result) => {
  audioPlayer.playbackRate = result.speed || 1.0;
});

// 起動時に保存された有効/無効状態でページを初期化
chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  updatePageState(isEnabled);
});

// ストレージの変更（主に有効/無効の変更）を監視
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    updatePageState(isEnabled);
  }
});

// --- 関数の定義 ---
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

// ▼▼▼ 消えていた関数をここに追加 ▼▼▼
function handleClick(event) {
  const target = event.target.closest(".auticle-clickable");
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  const startId = parseInt(target.dataset.auticleId, 10);
  const allParagraphs = document.querySelectorAll(".auticle-clickable");
  let textToPlay = "";
  allParagraphs.forEach((p) => {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId >= startId) {
      textToPlay += p.textContent + " ";
    }
  });

  if (textToPlay.trim()) {
    // テキストが長すぎるとGoogleが拒否するため、最初の約200文字に制限
    const shortText = textToPlay.substring(0, 200);
    // 再生依頼をbackground.jsに送信
    chrome.runtime.sendMessage({ command: "play", text: shortText });
  }
}

function speakWithGoogleTTS(text) {
  // この関数はbackground.jsに移動したため、content.jsでは不要です
  // ただし、handleClickは必要です
}
// ▲▲▲ ここまで ▲▲▲

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
