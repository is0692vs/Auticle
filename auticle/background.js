chrome.runtime.onInstalled.addListener(() => {
  console.log("Auticle extension installed.");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && !tab.url.startsWith("chrome://")) {
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
