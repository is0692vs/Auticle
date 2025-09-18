// popup.js
// document.addEventListener("DOMContentLoaded", () => {
//   const toggleSwitch = document.getElementById("toggle-switch");

//   chrome.storage.local.get(["enabled"], (result) => {
//     toggleSwitch.checked = !!result.enabled;
//   });

//   toggleSwitch.addEventListener("change", () => {
//     const isEnabled = toggleSwitch.checked;
//     chrome.storage.local.set({ enabled: isEnabled });
//   });
// });

document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");
  const speedSlider = document.getElementById("speed-slider");
  const speedValue = document.getElementById("speed-value");

  // --- 読み上げモードのトグル処理 ---
  chrome.storage.local.get(["enabled"], (result) => {
    toggleSwitch.checked = !!result.enabled;
  });

  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: isEnabled });
  });

  // ▼▼▼ 速度変更の処理を追加 ▼▼▼
  // 保存された速度を読み込んでスライダーに反映
  chrome.storage.local.get(["speed"], (result) => {
    const speed = result.speed || 1.0;
    speedSlider.value = speed;
    speedValue.textContent = `${parseFloat(speed).toFixed(1)}x`;
  });

  // スライダーが操作されたときの処理
  speedSlider.addEventListener("input", () => {
    const speed = speedSlider.value;
    speedValue.textContent = `${parseFloat(speed).toFixed(1)}x`;

    // 変更をストレージに保存
    chrome.storage.local.set({ speed: speed });

    // content.jsに速度変更をリアルタイムで通知
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          command: "changeSpeed",
          speed: speed,
        });
      }
    });
  });
  // ▲▲▲ ここまで ▲▲▲
});
