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
});
