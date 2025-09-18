// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "play") {
    const text = message.text;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=ja`;

    // fetchを使って音声データを取得
    fetch(ttsUrl)
      .then((response) => response.blob())
      .then((blob) => {
        // BlobをData URLに変換
        const reader = new FileReader();
        reader.onload = (e) => {
          // content.jsに再生命令を送り返す
          chrome.tabs.sendMessage(sender.tab.id, {
            command: "playAudio",
            audioDataUrl: e.target.result,
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => console.error("TTS Fetch Error:", error));
  }
  return true; // 非同期応答のためにtrueを返す
});
