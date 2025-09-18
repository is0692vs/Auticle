console.log("Content script placeholder.");

if (!window.auticleListenerAdded) {
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.command === "stateChange") {
      console.log("Auticle state changed to:", message.enabled);
    }
  });
  window.auticleListenerAdded = true;
}
