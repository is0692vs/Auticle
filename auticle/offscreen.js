console.log("Offscreen document loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);
  if (message.command === "play") {
    console.log("Playing TTS:", message.text.substring(0, 100) + "...");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    speechSynthesis.speak(utterance);
  }
});
