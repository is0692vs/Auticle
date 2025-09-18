console.log("Popup script loaded.");

document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.getElementById("toggle-switch");

  // Load state from storage
  chrome.storage.local.get(["enabled"], function (result) {
    const enabled = result.enabled || false;
    toggleSwitch.checked = enabled;
  });

  // Save state on change
  toggleSwitch.addEventListener("change", async function () {
    const enabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: enabled });

    // Inject content script and send message to active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && !tabs[0].url.startsWith("chrome://")) {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["content.js"],
      });
      chrome.tabs.sendMessage(tabs[0].id, {
        command: "stateChange",
        enabled: enabled,
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "checkPopup") {
    // Respond to indicate popup is open
    sendResponse();
  } else if (message.command === "play") {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    speechSynthesis.speak(utterance);
  }
});
