// content.js
console.log("Auticle content.js script started.");

let isClickAttached = false;
let isEnabled = false;

// ストレージの変更を監視
chrome.storage.onChanged.addListener((changes) => {
  console.log("Storage change detected:", changes);
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    updatePageState(isEnabled);
  }
});

// ページ読み込み時に初期化
chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  console.log("Initial state loaded. Auticle is", isEnabled ? "ON" : "OFF");
  updatePageState(isEnabled);
});

// ページのON/OFF状態を更新
function updatePageState(enabled) {
  console.log("Updating page state to:", enabled ? "ON" : "OFF");
  if (enabled) {
    preparePage();
  } else {
    cleanupPage();
  }
}

function preparePage() {
  console.log("preparePage() called.");
  const selectors = "article p, main p, .post-body p, .entry-content p";
  const paragraphs = document.querySelectorAll(selectors);
  paragraphs.forEach((p, index) => {
    p.dataset.auticleId = index;
    p.classList.add("auticle-clickable");
  });

  if (!isClickAttached) {
    console.log("Adding click listener...");
    document.addEventListener("click", handleClick, true);
    isClickAttached = true;
  } else {
    console.log("Click listener already attached.");
  }
  injectStyles("styles.css");
}

function cleanupPage() {
  console.log("cleanupPage() called.");
  speechSynthesis.cancel();
  const paragraphs = document.querySelectorAll(".auticle-clickable");
  paragraphs.forEach((p) => {
    p.classList.remove("auticle-clickable");
    delete p.dataset.auticleId;
  });

  if (isClickAttached) {
    console.log("Removing click listener...");
    document.removeEventListener("click", handleClick, true);
    isClickAttached = false;
  }
  removeStyles();
}

function handleClick(event) {
  console.log("--- handleClick fired! ---");
  const target = event.target.closest(".auticle-clickable");
  console.log("Clicked element:", event.target);
  console.log("Found target paragraph:", target);

  if (!target) {
    console.log("Click was outside a target paragraph. Exiting handleClick.");
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const startId = parseInt(target.dataset.auticleId, 10);
  const allParagraphs = document.querySelectorAll(".auticle-clickable");
  let textToPlay = "";

  allParagraphs.forEach((p) => {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId >= startId) {
      textToPlay += p.textContent + "\n\n";
    }
  });

  console.log("Text collected:", textToPlay.substring(0, 100) + "...");

  if (textToPlay.trim()) {
    speak(textToPlay);
  }
}

// ★★★ ここが修正された最終的なspeak関数です ★★★
function speak(text) {
  console.log("speak() function called.");

  // 常に既存の再生をキャンセル
  console.log("Cancelling any previous speech...");
  speechSynthesis.cancel();

  // 常に新しい発話を作成して、同期的に再生
  console.log("Creating new utterance and speaking immediately...");
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.onerror = (event) => {
    console.error("SpeechSynthesis Utterance Error:", event.error);
  };

  speechSynthesis.speak(utterance);
}
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★

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
