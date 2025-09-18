// content.js
let audioPlayer = new Audio();
let isClickAttached = false;
let isEnabled = false;

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
  const allParagraphs = document.querySelectorAll(".auticle-clickable");
  let textToPlay = "";
  allParagraphs.forEach((p) => {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId >= startId) {
      textToPlay += p.textContent + " ";
    }
  });

  if (textToPlay.trim()) {
    const shortText = textToPlay.substring(0, 200);
    chrome.runtime.sendMessage({ command: "play", text: shortText });
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
