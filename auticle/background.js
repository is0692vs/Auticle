// background.js
chrome.runtime.onInstalled.addListener(() => {
  // 拡張機能インストール時に、デフォルトでモードをOFFに設定する
  chrome.storage.local.set({ enabled: false });
  console.log("Auticle installed. Default state set to OFF.");
});
