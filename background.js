(() => {
  // background.ts
  console.log("[mock] background script loaded");
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[mock] background script installed");
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    }).then(() => {
      console.log("[mock] Cleaned up old dynamic rules on install");
    }).catch((error) => {
      console.log("[mock] No old rules to clean up:", error);
    });
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
      }).then(async (response) => {
        if (response.ok) {
          try {
            await chrome.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: [1],
              // 先移除可能存在的旧规则
              addRules: [
                {
                  id: 1,
                  priority: 1,
                  action: {
                    type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                    redirect: {
                      url: "http://localhost:4005/"
                    }
                  },
                  condition: {
                    urlFilter: "*/api/v*/core/conversation/chat/v*",
                    resourceTypes: [
                      chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
                    ]
                  }
                }
              ]
            });
            console.log("[mock] Dynamic rule added successfully");
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  chrome.tabs.sendMessage(
                    tab.id,
                    { type: "startMocking" },
                    () => {
                      if (chrome.runtime.lastError) {
                      } else {
                        console.log(`[mock] Started mocking in tab ${tab.id}`);
                      }
                    }
                  );
                }
              });
            });
            sendResponse({ success: true });
          } catch (error) {
            console.error("[mock] Error adding dynamic rule:", error);
            sendResponse({
              success: false,
              error: `Failed to add dynamic rule: ${error}`
            });
          }
        } else {
          const errorText = await response.text();
          console.error("[mock] Mock server setup failed:", errorText);
          sendResponse({
            success: false,
            error: `Failed to setup mock: ${errorText}`
          });
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
      }).then(() => {
        console.log("[mock] Dynamic rule removed successfully");
      }).catch((error) => {
        console.error("[mock] Error removing dynamic rule:", error);
      });
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: "stopMocking" }, () => {
              if (chrome.runtime.lastError) {
                console.log(
                  `[mock] Could not send message to tab ${tab.id}:`,
                  chrome.runtime.lastError.message
                );
              } else {
                console.log(`[mock] Stopped mocking in tab ${tab.id}`);
              }
            });
          }
        });
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
    if (message.type === "getDynamicRules") {
      chrome.declarativeNetRequest.getDynamicRules((rules) => {
        console.log("[mock] Current dynamic rules:", rules);
        sendResponse({ success: true, rules });
      });
      return true;
    }
    console.log("[mock] background received unknown message type:", message.type);
    sendResponse({ error: "Unknown message type" });
    return true;
  });
})();
