console.log("[Mock] content script loaded");
console.log("[Mock] chrome.runtime available:", !!chrome.runtime);
console.log("[Mock] chrome.runtime.sendMessage available:", !!chrome.runtime.sendMessage);

let isCapturing = false;

// 监听来自popup的消息
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

let observer: MutationObserver | null = null;

// 检查并获取conversation ID
const checkForConversationId = () => {
  const body = document.body;
  if (body) {
    const conversationId = body.getAttribute('data-conversation-id');
    if (conversationId) {
      console.log(`[mock] Found conversation ID: ${conversationId}`);
      
        // 然后发送捕获的ID到background script
        chrome.runtime.sendMessage({
          type: "capturedId",
          id: conversationId,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[mock] Error sending message to background:", chrome.runtime.lastError);
          } else {
            console.log("[mock] Message sent to background successfully:", response);
          }
        });
      
      return true; // 找到了ID
    }
  }
  return false; // 没找到ID
};

// 开始监听DOM变化
const startWatching = () => {
  console.log("[mock] Starting to watch for data-data-conversation-id-id");
  
  // 先检查当前是否已经有ID
  if (checkForConversationId()) {
    return; // 如果已经找到了，就不需要继续监听
  }
  
  // 如果没有找到，开始监听DOM变化
  if (observer) {
    observer.disconnect();
  }
  
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 检查属性变化
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-conversation-id' && 
          mutation.target === document.body) {
        if (checkForConversationId()) {
          stopWatching(); // 找到后停止监听
          return;
        }
      }
      
      // 检查新增的节点（防止body被重新创建）
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node === document.body || (node as Element)?.tagName === 'BODY') {
            if (checkForConversationId()) {
              stopWatching(); // 找到后停止监听
              return;
            }
          }
        }
      }
    }
  });
  
  // 监听body的属性变化和整个document的子节点变化
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-conversation-id'] });
  }
  observer.observe(document, { childList: true, subtree: true });
};

// 停止监听
const stopWatching = () => {
  console.log("[mock] Stopped watching for data-conversation-id");
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// 页面加载完成后检查一次
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (isCapturing) {
      checkForConversationId();
    }
  });
} else {
  // 如果页面已经加载完成，立即检查
  if (isCapturing) {
    checkForConversationId();
  }
}