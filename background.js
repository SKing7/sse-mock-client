(() => {
  // background.ts
  console.log("[mock] background script loaded");
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[mock] background script installed");
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[mock] background received message:", message, "from:", sender);
    if (message.type === "startMocking") {
      const { payload } = message;
      console.log(`Starting mock for with data:`, payload);
      fetch(`http://localhost:3000/api/mock-server`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).then((response) => {
        if (response.ok) {
          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [
              {
                id: 1,
                priority: 1,
                action: {
                  type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                  redirect: {
                    url: `http://localhost:4005/`
                  }
                },
                condition: {
                  regexFilter: "^https?://[^/]+/api/v[0-9]+\\.[0-9]+/core/conversation/chat/v[0-9]+.*",
                  resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
                  ]
                }
              }
            ],
            removeRuleIds: [1]
          });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Failed to setup mock" });
        }
      }).catch((error) => {
        console.error("Error setting up mock:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    if (message.type === "stopMocking") {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1]
      });
      sendResponse({ success: true });
      return true;
    }
    if (message.type === "capturedId") {
      console.log("[mock] background capturedId:", message);
      chrome.storage.local.set({
        capturedId: message.id,
        lastCaptureTime: Date.now()
      });
      sendResponse({ success: true });
      return true;
    }
    console.log("[mock] background received unknown message type:", message.type);
    sendResponse({ error: "Unknown message type" });
    return true;
  });
})();
