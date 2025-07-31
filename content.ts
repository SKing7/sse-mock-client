console.log("[Mock] content script loaded");
console.log("[Mock] chrome.runtime available:", !!chrome.runtime);
console.log(
  "[Mock] chrome.runtime.sendMessage available:",
  !!chrome.runtime.sendMessage
);

let isCapturing = false;
let checkingIDTimer = 0;

// 从 storage 中恢复 isCapturing 状态
const restoreCapturingState = async () => {
  try {
    const result = await chrome.storage.local.get(["isCapturing"]);
    if (result.isCapturing !== undefined) {
      isCapturing = result.isCapturing;
      console.log("[mock] Restored isCapturing state:", isCapturing);

      if (isCapturing) {
        intervalForCheckForConversationId();
      }
    }
  } catch (error) {
    console.error("[mock] Error restoring capturing state:", error);
  }
};

// 初始化时恢复状态
restoreCapturingState();

let preConversationId = "";
// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[mock] content.js onMessage", message);

  if (message.type === "toggleCapture") {
    if (message.enabled) {
      intervalForCheckForConversationId();
    } else {
      preConversationId = "";
      clearTimeout(checkingIDTimer);
    }
    isCapturing = message.enabled;
    console.log(`[mock] Capture ${isCapturing ? "enabled" : "disabled"}`);

    sendResponse({ success: true });
  }
});

const checkForConversationId = () => {
  const body = document.body;
  if (body) {
    const conversationId = body.getAttribute("data-conversation-id");
    if (conversationId && conversationId !== preConversationId) {
      console.log(`[mock] Found conversation ID: ${conversationId}`);
      preConversationId = conversationId;

      // 直接保存到storage，popup会监听这个变化
      chrome.storage.local
        .set({
          capturedId: conversationId,
          lastCaptureTime: Date.now(),
        })
        .then(() => {
          console.log(
            `[mock] Saved conversation ID to storage: ${conversationId}`
          );
        })
        .catch((error) => {
          console.error("[mock] Error saving to storage:", error);
        });

      return true; // 找到了ID
    }
  }
  return false; // 没找到ID
};

const intervalForCheckForConversationId = () => {
  clearTimeout(checkingIDTimer);
  checkForConversationId();
  checkingIDTimer = setTimeout(() => {
    intervalForCheckForConversationId();
  }, 1000);
};
