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
  });
});
