// background.js
// テキストをクリーンアップする関数
function cleanText(text) {
  // URLを除去
  text = text.replace(/https?:\/\/[^\s]+/g, "");
  // 特殊文字を除去（句読点以外）
  text = text.replace(
    /[^\w\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g,
    ""
  );
  // 連続する空白を1つに
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "play") {
    const text = cleanText(message.text);
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
    const text = cleanText(message.text);
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
