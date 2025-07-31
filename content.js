(() => {
  // content.ts
  console.log("[Mock] content script loaded");
  console.log("[Mock] chrome.runtime available:", !!chrome.runtime);
  console.log(
    "[Mock] chrome.runtime.sendMessage available:",
    !!chrome.runtime.sendMessage
  );
  var isCapturing = false;
  var checkingIDTimer = 0;
  var restoreCapturingState = async () => {
    try {
      const result = await chrome.storage.local.get(["isCapturing"]);
      if (result.isCapturing !== void 0) {
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
  restoreCapturingState();
  var preConversationId = "";
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
  var checkForConversationId = () => {
    const body = document.body;
    if (body) {
      const conversationId = body.getAttribute("data-conversation-id");
      if (conversationId && conversationId !== preConversationId) {
        console.log(`[mock] Found conversation ID: ${conversationId}`);
        preConversationId = conversationId;
        chrome.storage.local.set({
          capturedId: conversationId,
          lastCaptureTime: Date.now()
        }).then(() => {
          console.log(
            `[mock] Saved conversation ID to storage: ${conversationId}`
          );
        }).catch((error) => {
          console.error("[mock] Error saving to storage:", error);
        });
        return true;
      }
    }
    return false;
  };
  var intervalForCheckForConversationId = () => {
    clearTimeout(checkingIDTimer);
    checkForConversationId();
    checkingIDTimer = setTimeout(() => {
      intervalForCheckForConversationId();
    }, 1e3);
  };
})();
