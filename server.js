const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// 存储mock配置
let mockConfigs = new Map();

// 预设的mock数据列表
const presetData = [
  { value: 'user-data', label: '用户数据Mock' },
  { value: 'order-data', label: '订单数据Mock' },
  { value: 'product-data', label: '商品数据Mock' }
];

// 预设的mock响应数据
const mockResponses = {
  'user-data': {
    code: 200,
    data: {
      id: 1,
      name: 'Mock用户',
      email: 'mock@example.com',
      role: 'admin'
    },
    message: 'success'
  },
  'order-data': {
    code: 200,
    data: {
      orderId: 'ORD-12345',
      amount: 99.99,
      status: 'completed',
      items: [
        { name: 'Mock商品1', quantity: 2, price: 29.99 },
        { name: 'Mock商品2', quantity: 1, price: 39.99 }
      ]
    },
    message: 'success'
  },
  'product-data': {
    code: 200,
    data: [
      { id: 1, name: 'Mock商品A', price: 19.99, stock: 100 },
      { id: 2, name: 'Mock商品B', price: 29.99, stock: 50 },
      { id: 3, name: 'Mock商品C', price: 39.99, stock: 25 }
    ],
    message: 'success'
  }
};

// 获取预设数据列表
app.get('/preset-data', (req, res) => {
  res.json(presetData);
});

// 设置mock配置
app.post('/setup-mock', (req, res) => {
  const { capturedId, mockData } = req.body;
  
  if (!capturedId || !mockData) {
    return res.status(400).json({ error: 'Missing capturedId or mockData' });
  }
  
  mockConfigs.set(capturedId, mockData);
  console.log(`Mock配置已设置: ID=${capturedId}, Data=${mockData}`);
  
  res.json({ success: true, message: 'Mock配置成功' });
});

// Mock API端点
app.all('/mock-api/:id', (req, res) => {
  const { id } = req.params;
  const mockDataType = mockConfigs.get(id);
  
  if (!mockDataType) {
    return res.status(404).json({ error: 'Mock配置未找到' });
  }
  
  const mockResponse = mockResponses[mockDataType];
  if (!mockResponse) {
    return res.status(404).json({ error: 'Mock数据未找到' });
  }
  
  console.log(`返回Mock数据: ID=${id}, Type=${mockDataType}`);
  
  // 模拟网络延迟
  setTimeout(() => {
    res.json(mockResponse);
  }, 100);
});

// 获取当前mock配置状态
app.get('/mock-status', (req, res) => {
  const configs = Array.from(mockConfigs.entries()).map(([id, type]) => ({
    id,
    type,
    active: true
  }));
  
  res.json({ configs });
});

// 清除mock配置
app.delete('/mock-config/:id', (req, res) => {
  const { id } = req.params;
  const deleted = mockConfigs.delete(id);
  
  if (deleted) {
    res.json({ success: true, message: 'Mock配置已删除' });
  } else {
    res.status(404).json({ error: 'Mock配置未找到' });
  }
});

app.listen(port, () => {
  console.log(`Mock服务器运行在 http://localhost:${port}`);
  console.log('可用端点:');
  console.log('  GET  /preset-data     - 获取预设数据列表');
  console.log('  POST /setup-mock      - 设置mock配置');
  console.log('  ALL  /mock-api/:id    - Mock API响应');
  console.log('  GET  /mock-status     - 获取mock状态');
  console.log('  DEL  /mock-config/:id - 删除mock配置');
});