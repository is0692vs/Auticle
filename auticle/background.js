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

  // バッチフェッチ
  if (message.command === "batchFetch") {
    const promises = message.batch.map(({ index, text }) => {
      const cleanedText = cleanText(text);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
        cleanedText
      )}&tl=ja`;

      return fetch(ttsUrl)
        .then((response) => response.blob())
        .then((blob) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ index, audioDataUrl: reader.result });
            reader.readAsDataURL(blob);
          });
        })
        .catch((error) => {
          console.error("TTS Batch Fetch Error for index", index, ":", error);
          return { index, error: String(error) };
        });
    });

    Promise.all(promises).then((results) => {
      const audioDataUrls = results.filter((r) => r.audioDataUrl);
      sendResponse({ audioDataUrls });
    });

    return true;
  }

  // 全キュー一括フェッチ
  if (message.command === "fullBatchFetch") {
    const promises = message.batch.map(({ index, text }) => {
      const cleanedText = cleanText(text);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
        cleanedText
      )}&tl=ja`;

      return fetch(ttsUrl)
        .then((response) => response.blob())
        .then((blob) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ index, audioDataUrl: reader.result });
            reader.readAsDataURL(blob);
          });
        })
        .catch((error) => {
          console.error(
            "TTS Full Batch Fetch Error for index",
            index,
            ":",
            error
          );
          return { index, error: String(error) };
        });
    });

    Promise.all(promises).then((results) => {
      const audioDataUrls = results.filter((r) => r.audioDataUrl);
      sendResponse({ audioDataUrls });
    });

    return true;
  }
});
