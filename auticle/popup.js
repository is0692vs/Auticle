// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");
  const pauseResumeBtn = document.getElementById("pause-resume-btn");

  // 起動時にストレージから現在の状態を読み込み、スイッチに反映
  chrome.storage.local.get(["enabled"], (result) => {
    toggleSwitch.checked = !!result.enabled;
  });

  // スイッチが操作されたら、ストレージに新しい状態を保存するだけ
  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: isEnabled });
  });

  // 一時停止/再開ボタン
  pauseResumeBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { command: "togglePauseResume" },
          (response) => {
            if (response && response.isPlaying !== undefined) {
              pauseResumeBtn.textContent = response.isPlaying
                ? "一時停止"
                : "再開";
            }
          }
        );
      }
    });
  });
});
