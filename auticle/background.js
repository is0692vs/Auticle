chrome.runtime.onInstalled.addListener(() => {
  console.log("Auticle extension installed.");
  // Create offscreen document for TTS
  chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play text-to-speech audio in the background",
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });

    // Send current state
    chrome.storage.local.get(["enabled"], (result) => {
      const enabled = result.enabled || false;
      chrome.tabs.sendMessage(tabId, {
        command: "stateChange",
        enabled: enabled,
      });
    });
  }
});

// Forward play messages to offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message, "from sender:", sender);
  if (message.command === "play" && sender.tab) {
    // Check if popup is open
    chrome.runtime
      .sendMessage({ command: "checkPopup" })
      .then(() => {
        // Popup is open, send to popup
        chrome.runtime.sendMessage(message);
      })
      .catch(() => {
        // Popup not open, open popup tab
        chrome.tabs.create(
          { url: chrome.runtime.getURL("popup.html") },
          (tab) => {
            // Wait a bit for popup to load, then send message
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, message);
            }, 1000);
          }
        );
      });
  }
});
