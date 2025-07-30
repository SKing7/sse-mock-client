(() => {
  // content.ts
  console.log("[Mock] content script loaded");
  console.log("[Mock] chrome.runtime available:", !!chrome.runtime);
  console.log("[Mock] chrome.runtime.sendMessage available:", !!chrome.runtime.sendMessage);
  var isCapturing = false;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[mock] content.js onMessage", message);
    if (message.type === "toggleCapture") {
      isCapturing = message.enabled;
      console.log(`[mock] Capture ${isCapturing ? "enabled" : "disabled"}`);
      if (isCapturing) {
        startWatching();
      } else {
        stopWatching();
      }
      sendResponse({ success: true });
    }
  });
  var observer = null;
  var checkForConversationId = () => {
    const body = document.body;
    if (body) {
      const conversationId = body.getAttribute("data-conversation-id");
      if (conversationId) {
        console.log(`[mock] Found conversation ID: ${conversationId}`);
        chrome.runtime.sendMessage({
          type: "capturedId",
          id: conversationId
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[mock] Error sending message to background:", chrome.runtime.lastError);
          } else {
            console.log("[mock] Message sent to background successfully:", response);
          }
        });
        return true;
      }
    }
    return false;
  };
  var startWatching = () => {
    console.log("[mock] Starting to watch for data-data-conversation-id-id");
    if (checkForConversationId()) {
      return;
    }
    if (observer) {
      observer.disconnect();
    }
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-conversation-id" && mutation.target === document.body) {
          if (checkForConversationId()) {
            stopWatching();
            return;
          }
        }
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node === document.body || node?.tagName === "BODY") {
              if (checkForConversationId()) {
                stopWatching();
                return;
              }
            }
          }
        }
      }
    });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["data-conversation-id"] });
    }
    observer.observe(document, { childList: true, subtree: true });
  };
  var stopWatching = () => {
    console.log("[mock] Stopped watching for data-conversation-id");
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (isCapturing) {
        checkForConversationId();
      }
    });
  } else {
    if (isCapturing) {
      checkForConversationId();
    }
  }
})();
