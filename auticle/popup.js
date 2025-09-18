console.log("Popup script loaded.");

document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.getElementById("toggle-switch");

  // Load state from storage
  chrome.storage.local.get(["enabled"], function (result) {
    const enabled = result.enabled || false;
    toggleSwitch.checked = enabled;
  });

  // Save state on change
  toggleSwitch.addEventListener("change", function () {
    const enabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: enabled });

    // Send message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          command: "stateChange",
          enabled: enabled,
        });
      }
    });
  });
});
