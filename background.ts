import { CONFIG, getFullUrl } from './config';

console.log('[mock] background script loaded');

// 图标管理函数
const updateIcon = (isMocking: boolean) => {
  const iconPaths = isMocking
    ? {
        '16': 'images/mock_on_16.png',
        '48': 'images/mock_on_48.png',
        '128': 'images/mock_on_128.png',
      }
    : {
        '16': 'images/mock_off_16.png',
        '48': 'images/mock_off_48.png',
        '128': 'images/mock_off_128.png',
      };

  console.log(`[mock] updateIcon: ${isMocking ? 'ON' : 'OFF'}`);

  chrome.action.setIcon(
    {
      path: iconPaths,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('[mock] Error setting icon:', chrome.runtime.lastError);
      } else {
        console.log(`[mock] Icon updated: ${isMocking ? 'ON' : 'OFF'}`);
      }
    }
  );
};

// 监听storage变化来同步图标状态
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isMocking) {
    const isMocking = changes.isMocking.newValue;

    updateIcon(isMocking);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[mock] background script installed');

  // 初始化图标为off状态
  updateIcon(false);

  // 清理可能存在的旧规则
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2],
    })
    .then(() => {
      console.log('[mock] Cleaned up old dynamic rules on install');
    })
    .catch((error) => {
      console.log('[mock] No old rules to clean up:', error);
    });
});

// 启动时恢复图标状态
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['isMocking'], (result) => {
    const isMocking = result.isMocking || false;
    updateIcon(isMocking);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[mock] background received message:', message, 'from:', sender);

  // 添加 ping 处理来确保 background script 是活跃的
  if (message.type === 'ping') {
    console.log('[mock] background received ping');
    sendResponse({ success: true, message: 'pong' });
    return true;
  }

  if (message.type === 'startMocking') {
    const { payload } = message;

    console.log(`[mock] Starting mock for with data:`, payload);

    // 将 payload 转换为 URL search 参数
    const searchParams = new URLSearchParams();
    if (payload && typeof payload === 'object') {
      Object.entries(payload.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    // 构建带有查询参数的完整 URL
    const baseUrl = getFullUrl(
      CONFIG.MOCK_SERVER.BASE_URL,
      CONFIG.MOCK_SERVER.ENDPOINTS.MOCK_SERVER
    );
    const fullUrl = searchParams.toString()
      ? `${baseUrl}?${searchParams.toString()}`
      : baseUrl;

    console.log('mock fullurl', fullUrl);
    try {
      // 使用 declarativeNetRequest 重定向请求到mock服务器并处理跨域
      chrome.declarativeNetRequest
        .updateDynamicRules({
          removeRuleIds: [1, 2], // 先移除可能存在的旧规则
          addRules: [
            // 规则1: 重定向请求到mock服务器
            {
              id: 1,
              priority: 1,
              action: {
                type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                redirect: {
                  url: fullUrl,
                },
              },
              condition: {
                urlFilter: CONFIG.API_PATTERNS.CHAT_API,
                resourceTypes: [
                  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                  chrome.declarativeNetRequest.ResourceType.OTHER,
                ],
              },
            },
            // 规则2: 为mock服务器的响应添加CORS头
            {
              id: 2,
              priority: 1,
              action: {
                type: chrome.declarativeNetRequest.RuleActionType
                  .MODIFY_HEADERS,
                responseHeaders: [
                  {
                    header: 'Access-Control-Allow-Origin',
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: '*',
                  },
                  {
                    header: 'Access-Control-Allow-Methods',
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: 'GET, POST, PUT, DELETE, OPTIONS',
                  },
                  {
                    header: 'Access-Control-Allow-Headers',
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: [
                      'digest',
                      'Content-Type',
                      'Authorization',
                      'X-Yuanshi-source',
                      'x-yuanshi-authorization',
                      'X-Requested-With',
                      'x-date',
                      'X-Yuanshi-AppName',
                      'X-Yuanshi-AppVersionName',
                      'X-Yuanshi-AppVersionCode',
                      'x-yuanshi-channel',
                      'X-Yuanshi-TimeZone',
                      'X-Yuanshi-DeviceOS',
                      'X-Yuanshi-Locale',
                      'x-yuanshi-platform',
                      'x-yuanshi-deviceid',
                      'x-yuanshi-devicemode',
                    ].join(', '),
                  },
                ],
              },
              condition: {
                urlFilter: `${CONFIG.MOCK_SERVER.BASE_URL}${CONFIG.MOCK_SERVER.ENDPOINTS.MOCK_SERVER}`,
                resourceTypes: [
                  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                  chrome.declarativeNetRequest.ResourceType.OTHER,
                ],
              },
            },
          ],
        })
        .then(() => {
          console.log('[mock] Dynamic rule added successfully');
          // 更新图标为开启状态
          updateIcon(true);

          // 通知所有 content scripts 开始 mocking
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (tab.id) {
                chrome.tabs.sendMessage(
                  tab.id,
                  { type: 'startMocking' },
                  () => {
                    if (chrome.runtime.lastError) {
                      // 忽略无法发送消息的标签页
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
      console.error('[mock] Error adding dynamic rule:', error);
      sendResponse({
        success: false,
        error: `Failed to add dynamic rule: ${error}`,
      });
    }

    return true; // 保持消息通道开放以支持异步响应
  }

  if (message.type === 'stopMocking') {
    // 移除动态规则
    chrome.declarativeNetRequest
      .updateDynamicRules({
        removeRuleIds: [1, 2],
      })
      .then(() => {
        console.log('[mock] Dynamic rule removed successfully');
        // 更新图标为关闭状态
        updateIcon(false);
      })
      .catch((error) => {
        console.error('[mock] Error removing dynamic rule:', error);
      });

    // 通知所有 content scripts 停止 mocking
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'stopMocking' }, () => {
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

  if (message.type === 'getDynamicRules') {
    // 调试功能：获取当前的动态规则
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      console.log('[mock] Current dynamic rules:', rules);
      sendResponse({ success: true, rules });
    });
    return true;
  }

  // 如果没有匹配的消息类型，也要返回响应
  console.log('[mock] background received unknown message type:', message.type);
  sendResponse({ error: 'Unknown message type' });
  return true;
});
