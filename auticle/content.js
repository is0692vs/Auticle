console.log("Content script placeholder.");

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.command === "stateChange") {
    console.log("Auticle state changed to:", message.enabled);
  }
});
