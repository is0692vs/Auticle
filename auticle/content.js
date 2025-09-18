// content.js
let isClickAttached = false;
let isEnabled = false;

// ストレージの変更を監視するリスナー
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    console.log("Storage changed: Auticle is now", isEnabled ? "ON" : "OFF");
    updatePageState(isEnabled);
  }
});

// ページ読み込み時に一度だけ、現在の状態で初期化
chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  console.log("Initial state: Auticle is", isEnabled ? "ON" : "OFF");
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
  speechSynthesis.cancel();
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

  console.log(
    "Clicked on paragraph:",
    target.textContent.substring(0, 50) + "..."
  );

  const startId = parseInt(target.dataset.auticleId, 10);
  const allParagraphs = document.querySelectorAll(".auticle-clickable");
  let textToPlay = "";

  allParagraphs.forEach((p) => {
    const currentId = parseInt(p.dataset.auticleId, 10);
    if (currentId >= startId) {
      textToPlay += p.textContent + "\n\n";
    }
  });

  if (textToPlay.trim()) {
    speak(textToPlay);
  }
}

function speak(text) {
  console.log("Attempting to speak...");
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }, 150); // 少し長めに待つ
  } else {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
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
