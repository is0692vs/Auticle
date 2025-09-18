// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "play") {
    const text = message.text;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=ja`;

    fetch(ttsUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              command: "playAudio",
              audioDataUrl: e.target.result,
            });
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => console.error("TTS Fetch Error:", error));

    return true; // 非同期で応答を返すためtrueを返す
  }

  // prefetch 用に audioDataUrl を返すエンドポイント
  if (message.command === "fetch") {
    const text = message.text;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=ja`;

    fetch(ttsUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // 呼び出し元に audioDataUrl を返す
          sendResponse({ audioDataUrl: e.target.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        console.error("TTS Fetch Error:", error);
        sendResponse({ error: String(error) });
      });

    return true; // 非同期で sendResponse を使うため true を返す
  }
});
