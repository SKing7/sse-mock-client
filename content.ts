console.log("[Mock] content script loaded");
console.log("[Mock] chrome.runtime available:", !!chrome.runtime);
console.log(
  "[Mock] chrome.runtime.sendMessage available:",
  !!chrome.runtime.sendMessage
);

let isCapturing = false;
let isMockingActive = false;
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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[mock] content.js onMessage", message);

  if (message.type === "toggleCapture") {
    if (!isCapturing && message.enabled) {
      intervalForCheckForConversationId();
    } else if (isCapturing && !message.enabled) {
      isCapturing = message.enabled;
      clearTimeout(checkingIDTimer);
    }
    console.log(`[mock] Capture ${isCapturing ? "enabled" : "disabled"}`);

    sendResponse({ success: true });
  }
});

let preConversationId = "";

const checkForConversationId = () => {
  const body = document.body;
  if (body) {
    const conversationId = body.getAttribute("data-conversation-id");
    if (conversationId && conversationId !== preConversationId) {
      console.log(`[mock] Found conversation ID: ${conversationId}`);
      preConversationId = conversationId;

      // 然后发送捕获的ID到background script
      chrome.runtime.sendMessage(
        {
          type: "capturedId",
          id: conversationId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[mock] Error sending message to background:",
              chrome.runtime.lastError
            );
          } else {
            console.log(
              "[mock] Message sent to background successfully:",
              response
            );
          }
        }
      );

      return true; // 找到了ID
    }
  }
  return false; // 没找到ID
};

const intervalForCheckForConversationId = () => {
  checkForConversationId();
  checkingIDTimer = setTimeout(() => {
    intervalForCheckForConversationId();
  }, 1000);
};
