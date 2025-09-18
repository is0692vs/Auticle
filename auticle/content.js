// content.js

// --- グローバル変数 ---
let isListenerAdded = false;

// --- メインロジック ---

// ★★★★★ 新しいメインロジック ★★★★★
// ストレージの変更を監視するリスナー
chrome.storage.onChanged.addListener((changes, namespace) => {
  // 'enabled' の値が変更された場合のみ反応
  if (changes.enabled) {
    const isEnabled = changes.enabled.newValue;
    console.log("Auticle state changed via storage:", isEnabled);
    if (isEnabled) {
      preparePage();
    } else {
      cleanupPage();
    }
  }
});

// ページ読み込み時に、保存された状態で初期化する
chrome.storage.local.get(["enabled"], (result) => {
  console.log("Auticle initial state loaded:", result.enabled);
  if (result.enabled) {
    preparePage();
  }
});

// --- DOM操作関数 ---
function preparePage() {
  if (isListenerAdded) return;

  injectStyles("styles.css");
  const selectors = "article p, main p, .post-body p, .entry-content p";
  const paragraphs = document.querySelectorAll(selectors);
  paragraphs.forEach((p, index) => {
    p.dataset.auticleId = index;
    p.classList.add("auticle-clickable");
  });

  document.addEventListener("click", handleClick);
  isListenerAdded = true;
}

function cleanupPage() {
  speechSynthesis.cancel();
  const paragraphs = document.querySelectorAll(".auticle-clickable");
  paragraphs.forEach((p) => {
    p.classList.remove("auticle-clickable");
    delete p.dataset.auticleId;
  });

  removeStyles();
  document.removeEventListener("click", handleClick);
  isListenerAdded = false;
}

// --- イベントハンドラとヘルパー関数 ---
function handleClick(event) {
  // ... (この関数は変更なし) ...
  const target = event.target.closest(".auticle-clickable");
  if (!target) return;

  const startId = parseInt(target.dataset.auticleId, 10);
  const allParagraphs = document.querySelectorAll(".auticle-clickable");
  let textToPlay = "";

  allParagraphs.forEach((p) => {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId >= startId) {
      textToPlay += p.textContent + "\n\n";
    }
  });

  if (textToPlay.trim() !== "") {
    speak(textToPlay);
  }
}

function speak(text) {
  // ... (この関数は変更なし) ...
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }, 100);
  } else {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
}

function injectStyles(filePath) {
  // ... (この関数は変更なし) ...
  if (document.getElementById("auticle-styles")) return;
  const link = document.createElement("link");
  link.id = "auticle-styles";
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL(filePath);
  document.head.appendChild(link);
}

function removeStyles() {
  // ... (この関数は変更なし) ...
  const link = document.getElementById("auticle-styles");
  if (link) {
    link.remove();
  }
}
