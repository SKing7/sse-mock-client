console.log("[mock] background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[mock] background script installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[mock] background received message:", message, "from:", sender);

  if (message.type === "startMocking") {
    const { payload } = message;

    console.log(`Starting mock for with data:`, payload);

    // 调用本地服务器设置mock数据
    fetch(`http://localhost:3000/api/mock-server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          // 设置网络请求拦截规则，使用正则表达式匹配
          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [
              {
                id: 1,
                priority: 1,
                action: {
                  type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                  redirect: {
                    url: `http://localhost:4005/`,
                  },
                },
                condition: {
                  regexFilter:
                    "^https?://[^/]+/api/v[0-9]+\\.[0-9]+/core/conversation/chat/v[0-9]+.*",
                  resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                  ],
                },
              },
            ],
            removeRuleIds: [1],
          });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Failed to setup mock" });
        }
      })
      .catch((error) => {
        console.error("Error setting up mock:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道开放以支持异步响应
  }

  if (message.type === "stopMocking") {
    // 移除拦截规则
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "capturedId") {
    console.log("[mock] background capturedId:", message);
    // 将捕获的ID保存到storage，popup会监听这个变化
    chrome.storage.local.set({
      capturedId: message.id,
      lastCaptureTime: Date.now(),
    });
    sendResponse({ success: true });
    return true;
  }

  // 如果没有匹配的消息类型，也要返回响应
  console.log("[mock] background received unknown message type:", message.type);
  sendResponse({ error: "Unknown message type" });
  return true;
});
