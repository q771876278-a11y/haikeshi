# haikeshi

一个纯前端的 React + Vite + Tailwind CSS 扫码点餐网页，适合朋友聚会时用手机访问。菜品数据来自 `src/data/dishes.json`，订单可通过 Webhook 提交；未配置 Webhook 时会自动进入本地测试模式，并把订单保存到浏览器 `localStorage`。

## 运行

```bash
npm install
npm run dev
```

开发服务器默认监听局域网地址，方便同一 Wi-Fi 下手机扫码访问终端里显示的 Network URL。

## 环境变量

复制示例文件并填写 Webhook 地址：

```bash
cp .env.example .env
```

```env
VITE_ORDER_WEBHOOK_URL=https://your-webhook.example/order
```

如果不创建 `.env` 或留空 `VITE_ORDER_WEBHOOK_URL`，应用会进入测试模式，订单保存到：

```text
localStorage["party-qr-orders"]
```

## 订单数据格式

提交到 Webhook 的 JSON 示例：

```json
{
  "id": "order-1733123456789",
  "tableName": "朋友桌",
  "guestName": "小明",
  "note": "少辣",
  "items": [
    {
      "id": "crispy-chicken",
      "name": "香脆盐酥鸡",
      "price": 36,
      "quantity": 2,
      "subtotal": 72
    }
  ],
  "totalQuantity": 2,
  "totalPrice": 72,
  "mode": "webhook",
  "createdAt": "2026-06-17T12:00:00.000Z"
}
```

## 项目结构

```text
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    └── data/
        └── dishes.json
```

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`，可部署到任意静态托管服务。
