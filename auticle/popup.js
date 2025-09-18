// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");

  // 起動時にストレージから現在の状態を読み込み、スイッチに反映
  chrome.storage.local.get(["enabled"], (result) => {
    toggleSwitch.checked = !!result.enabled;
  });

  // スイッチが操作されたら、ストレージに新しい状態を保存するだけ
  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: isEnabled });
  });
});
