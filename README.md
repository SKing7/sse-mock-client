# Teding Mock Chrome Extension

一个用于自动实现对teding规则请求的mock数据的Chrome插件。

## 功能特性

- 🎯 自动捕获页面console.log中的teding规则ID
- 🔄 拦截网络请求并代理到本地mock服务器
- 📋 支持多种预设mock数据类型
- 🎛️ 简洁的popup界面控制
- 🚀 实时开启/关闭mock功能

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 构建插件

```bash
npm run build
```

### 3. 启动本地mock服务器

```bash
npm run server
```

服务器将在 `http://localhost:3000` 启动。

### 4. 加载Chrome插件

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录

## 使用流程

### 1. 准备工作
- 确保本地mock服务器正在运行
- 在Chrome中加载插件

### 2. 捕获规则ID
1. 点击插件图标打开popup界面
2. 勾选"捕获 Console Log"开关
3. 在目标网页中触发相关操作，让页面输出包含teding规则的console.log
4. 插件会自动捕获规则ID并显示在输入框中

### 3. 开始Mock
1. 在下拉框中选择要使用的mock数据类型
2. 确认捕获的规则ID正确
3. 点击"开始 Mock"按钮
4. 插件会设置网络拦截规则，将匹配的请求代理到本地服务器

### 4. 停止Mock
- 点击"停止 Mock"按钮即可停止拦截

## 配置说明

### Mock数据类型

目前支持以下预设mock数据：

- **用户数据Mock**: 模拟用户信息接口响应
- **订单数据Mock**: 模拟订单信息接口响应  
- **商品数据Mock**: 模拟商品列表接口响应

### 规则ID捕获逻辑

插件会监听console.log输出，匹配以下模式：
- `teding_rule_xxx`
- `teding-rule-xxx`
- `rule_id: xxx`
- `rule id: xxx`

你可以在 `content.ts` 中修改 `tedingRulePattern` 正则表达式来适配你的具体需求。

### 网络拦截规则

默认拦截所有 `*/api/*` 路径的XMLHttpRequest请求。可以在 `background.ts` 中修改 `urlFilter` 来调整拦截范围。

## API接口

本地mock服务器提供以下接口：

- `GET /preset-data` - 获取预设数据列表
- `POST /setup-mock` - 设置mock配置
- `ALL /mock-api/:id` - Mock API响应端点
- `GET /mock-status` - 获取当前mock状态
- `DELETE /mock-config/:id` - 删除mock配置

## 开发和调试

### 构建单个组件

```bash
# 构建popup
npm run build:popup

# 构建background script
npm run build:background

# 构建content script  
npm run build:content
```

### 调试技巧

1. **查看background script日志**: 在 `chrome://extensions/` 中点击插件的"检查视图"
2. **查看content script日志**: 在目标页面按F12打开开发者工具
3. **查看popup日志**: 右键点击插件图标，选择"检查弹出内容"

## 常见问题

### Q: 无法连接到本地服务器
A: 确保本地服务器正在运行，并且端口3000没有被占用。

### Q: 捕获不到规则ID
A: 检查页面的console.log输出格式，可能需要调整 `content.ts` 中的匹配规则。

### Q: 网络请求没有被拦截
A: 检查 `background.ts` 中的 `urlFilter` 是否匹配目标请求的URL模式。

## 自定义扩展

### 添加新的Mock数据类型

1. 在 `server.js` 中的 `presetData` 数组添加新选项
2. 在 `mockResponses` 对象中添加对应的响应数据

### 修改捕获规则

在 `content.ts` 中修改 `tedingRulePattern` 正则表达式：

```typescript
const tedingRulePattern = /your-custom-pattern/i;
```

### 调整拦截范围

在 `background.ts` 中修改网络拦截条件：

```typescript
condition: {
  urlFilter: '*://your-domain.com/api/*',
  resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
}
```

## 许可证

ISC License