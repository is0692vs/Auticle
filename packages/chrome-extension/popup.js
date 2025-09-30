// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");
  const pauseResumeBtn = document.getElementById("pause-resume-btn");

  // 現在のタブのURLを取得して、そのURLの状態を読み込む
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const url = tabs[0].url;
    const hostname = getHostnameFromUrl(url);

    // URLごとの状態を読み込む
    chrome.storage.local.get(["urlStates", "enabled"], (result) => {
      const urlStates = result.urlStates || {};
      // URLごとの状態が存在すればそれを使用、なければグローバルのenabledを使用（後方互換性）
      const isEnabled =
        hostname in urlStates ? urlStates[hostname] : !!result.enabled;
      toggleSwitch.checked = isEnabled;
    });

    // スイッチが操作されたら、そのURLの状態を保存
    toggleSwitch.addEventListener("change", () => {
      const isEnabled = toggleSwitch.checked;

      chrome.storage.local.get(["urlStates"], (result) => {
        const urlStates = result.urlStates || {};
        urlStates[hostname] = isEnabled;
        chrome.storage.local.set({ urlStates });
      });
    });
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

// URLからホスト名を取得するヘルパー関数
function getHostnameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url; // フォールバック
  }
}

