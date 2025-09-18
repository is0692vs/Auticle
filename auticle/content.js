console.log("Content script placeholder.");

if (!window.auticleListenerAdded) {
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.command === "stateChange") {
      console.log("Auticle state changed to:", message.enabled);
      if (message.enabled) {
        preparePage();
      } else {
        cleanupPage();
      }
    }
  });
  window.auticleListenerAdded = true;
}

function preparePage() {
  // Guard clause: if already prepared, skip
  if (document.querySelector(".auticle-clickable")) {
    return;
  }

  // Select paragraph elements in article or main
  const selectors = "article p, main p, .post-body p";
  const paragraphs = document.querySelectorAll(selectors);
  paragraphs.forEach((element, index) => {
    element.dataset.auticleId = index;
    element.classList.add("auticle-clickable");
  });

  // Inject styles
  injectStyles();

  // Add click event listener for triggering playback
  document.addEventListener("click", handleClick);
}

function cleanupPage() {
  // Remove classes and data attributes
  const clickableElements = document.querySelectorAll(".auticle-clickable");
  clickableElements.forEach((element) => {
    element.classList.remove("auticle-clickable");
    delete element.dataset.auticleId;
  });

  // Remove injected styles
  removeStyles();

  // Remove click event listener
  document.removeEventListener("click", handleClick);
}

function handleClick(event) {
  const target = event.target.closest(".auticle-clickable");
  if (target) {
    const id = parseInt(target.dataset.auticleId);
    const paragraphs = document.querySelectorAll(".auticle-clickable");
    let text = "";
    for (let i = id; i < paragraphs.length; i++) {
      text += paragraphs[i].textContent + "\n\n";
    }
    chrome.runtime.sendMessage({ command: "play", text: text });
  }
}

function injectStyles() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("styles.css");
  link.id = "auticle-styles";
  document.head.appendChild(link);
}

function removeStyles() {
  const link = document.getElementById("auticle-styles");
  if (link) {
    link.remove();
  }
}
