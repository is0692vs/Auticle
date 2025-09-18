// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");

  // 保存された状態を読み込んでスイッチに反映
  chrome.storage.local.get(["enabled"], (result) => {
    toggleSwitch.checked = result.enabled || false;
  });

  // スイッチが操作されたときの処理
  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    // 状態をストレージに保存するだけ
    chrome.storage.local.set({ enabled: isEnabled });
  });
});
