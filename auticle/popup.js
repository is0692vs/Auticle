// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");

  chrome.storage.local.get(["enabled"], (result) => {
    toggleSwitch.checked = !!result.enabled;
  });

  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: isEnabled });
  });
});
