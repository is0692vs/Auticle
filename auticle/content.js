// content.js
let audioPlayer = new Audio();

// background.jsからの再生命令を待つ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "playAudio") {
    audioPlayer.src = message.audioDataUrl;
    audioPlayer.play();
  }
});

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

// -----------------------------------------------------------------
// 以下、UIの状態管理に関するコード（変更なし）
// -----------------------------------------------------------------
let isClickAttached = false;
let isEnabled = false;

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    updatePageState(isEnabled);
  }
});

chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  updatePageState(isEnabled);
});

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
