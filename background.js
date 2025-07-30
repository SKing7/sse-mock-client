(() => {
  // config.ts
  var CONFIG = {
    // 本地 Mock 服务器配置
    MOCK_SERVER: {
      BASE_URL: "http://localhost:3000",
      ENDPOINTS: {
        MOCK_SERVER: "/api/mock-data",
        PRESET_DATA: "/api/preset-data"
      }
    },
    // API 匹配模式
    API_PATTERNS: {
      CHAT_API: "*/api/v*/core/conversation/chat/v*"
    }
  };
  var getFullUrl = (baseUrl, endpoint) => {
    return `${baseUrl}${endpoint}`;
  };

  // background.ts
  console.log("[mock] background script loaded");
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[mock] background script installed");
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2]
    }).then(() => {
      console.log("[mock] Cleaned up old dynamic rules on install");
    }).catch((error) => {
      console.log("[mock] No old rules to clean up:", error);
    });
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[mock] background received message:", message, "from:", sender);
    if (message.type === "ping") {
      console.log("[mock] background received ping");
      sendResponse({ success: true, message: "pong" });
      return true;
    }
    if (message.type === "startMocking") {
      const { payload } = message;
      console.log(`[mock] Starting mock for with data:`, payload);
      const searchParams = new URLSearchParams();
      if (payload && typeof payload === "object") {
        Object.entries(payload.params).forEach(([key, value]) => {
          if (value !== null && value !== void 0) {
            searchParams.append(key, String(value));
          }
        });
      }
      const baseUrl = getFullUrl(
        CONFIG.MOCK_SERVER.BASE_URL,
        CONFIG.MOCK_SERVER.ENDPOINTS.MOCK_SERVER
      );
      const fullUrl = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;
      console.log("mock fullurl", fullUrl);
      try {
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1, 2],
          // 先移除可能存在的旧规则
          addRules: [
            // 规则1: 重定向请求到mock服务器
            {
              id: 1,
              priority: 1,
              action: {
                type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                redirect: {
                  url: fullUrl
                }
              },
              condition: {
                urlFilter: CONFIG.API_PATTERNS.CHAT_API,
                resourceTypes: [
                  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                  chrome.declarativeNetRequest.ResourceType.OTHER
                ]
              }
            },
            // 规则2: 为mock服务器的响应添加CORS头
            {
              id: 2,
              priority: 1,
              action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                responseHeaders: [
                  {
                    header: "Access-Control-Allow-Origin",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "*"
                  },
                  {
                    header: "Access-Control-Allow-Methods",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "GET, POST, PUT, DELETE, OPTIONS"
                  },
                  {
                    header: "Access-Control-Allow-Headers",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: [
                      "digest",
                      "Content-Type",
                      "Authorization",
                      "X-Yuanshi-source",
                      "x-yuanshi-authorization",
                      "X-Requested-With",
                      "x-date",
                      "X-Yuanshi-AppName",
                      "X-Yuanshi-AppVersionName",
                      "X-Yuanshi-AppVersionCode",
                      "x-yuanshi-channel",
                      "X-Yuanshi-TimeZone",
                      "X-Yuanshi-DeviceOS",
                      "X-Yuanshi-Locale",
                      "x-yuanshi-platform",
                      "x-yuanshi-deviceid",
                      "x-yuanshi-devicemode"
                    ].join(", ")
                  }
                ]
              },
              condition: {
                urlFilter: "localhost:3000/api/mock-data*",
                resourceTypes: [
                  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                  chrome.declarativeNetRequest.ResourceType.OTHER
                ]
              }
            }
          ]
        }).then(() => {
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
        });
      } catch (error) {
        console.error("[mock] Error adding dynamic rule:", error);
        sendResponse({
          success: false,
          error: `Failed to add dynamic rule: ${error}`
        });
      }
      return true;
    }
    if (message.type === "stopMocking") {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1, 2]
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
