// 配置文件 - 统一管理所有服务器地址
export const CONFIG = {
  // 本地 Mock 服务器配置
  MOCK_SERVER: {
    BASE_URL: "https://sse-mock-server-btuhq3061-skingpts-projects.vercel.app",
    ENDPOINTS: {
      MOCK_SERVER: "/api/mock-data",
      PRESET_DATA: "/api/preset-data",
    },
  },

  // API 匹配模式
  API_PATTERNS: {
    CHAT_API: "*/api/v*/core/conversation/chat/v*",
  },
} as const;

// 辅助函数
export const getFullUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl}${endpoint}`;
};
