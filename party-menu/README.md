# party-menu

## 项目介绍

一个适合朋友聚会娱乐使用的扫码点餐网页项目。前台使用 React + Vite + Tailwind CSS 构建，菜品数据保存在本地 JSON 文件中；订单通过 Vercel Serverless API 提交到后端，并使用 Vercel KV / Upstash Redis 集中保存，管理员后台可以查询所有集中订单。

## 功能说明

- 手机端优先的点餐页面，适合朋友扫码访问。
- 顶部展示餐厅欢迎语和聚会氛围背景。
- 菜品按分类展示，分类 Tab 支持横向滚动。
- 只展示 `isAvailable: true` 的菜品，并按 `sortOrder` 排序。
- 每个菜品支持配置价格，点餐页、购物车和订单会显示金额。
- 菜品支持 `+` / `-` 修改数量，数量为 0 时自动从购物车移除。
- 底部固定购物车栏，显示已选数量、查看购物车和去提交按钮。
- 购物车抽屉从底部弹出，支持增减数量、删除菜品。
- 提交订单时填写朋友姓名和备注。
- 提供纯前端管理员后台页面，可新增、删除、编辑菜品，支持修改价格、分类、图片、上下架状态和排序。
- 管理员后台支持本地图片上传、菜品 JSON 导入和导出。
- 支持 `/api/orders` 后端提交订单，管理员后台可集中查询订单。
- 支持飞书自定义机器人推送，新订单会发送到飞书群。
- 本地开发时如果没有启动后端 API，会临时回落到浏览器 `localStorage` 方便测试。
- 支持生成点餐二维码，方便发给朋友扫码。

## 本地运行方法

进入项目目录：

```bash
cd party-menu
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

Vite 会在终端输出本地访问地址和局域网访问地址，例如：

```text
Local:   http://localhost:5175/
Network: http://192.168.x.x:5175/
```

手机和电脑连接同一个 Wi-Fi 后，可以用手机访问 `Network` 地址进行测试。

## 如何修改菜品

菜品数据在：

```text
src/data/dishes.json
```

每个菜品字段如下：

```json
{
  "id": "meat-spicy-chicken",
  "name": "辣子鸡",
  "category": "肉类",
  "image": "https://placehold.co/800x600?text=Spicy+Chicken",
  "description": "鸡块外酥里嫩，搭配干辣椒和花椒香气。",
  "price": 42,
  "isAvailable": true,
  "sortOrder": 4
}
```

字段说明：

- `id`：菜品唯一标识，不要重复。
- `name`：菜品名称。
- `category`：菜品分类，例如主食、肉类、海鲜、青菜、饮料、甜品。
- `image`：菜品图片 URL，可以替换为自己的图片地址。
- `description`：菜品描述。
- `price`：菜品价格，单位为元。
- `isAvailable`：是否可点，`true` 会显示，`false` 不显示。
- `sortOrder`：排序值，数字越小越靠前。

修改保存后，开发环境会自动刷新页面。

也可以打开管理员后台临时编辑：

```text
http://localhost:5175/#/admin
```

后台页面支持：

- 新增菜品
- 删除菜品
- 搜索菜品
- 按分类筛选
- 修改菜名、分类、价格、排序、描述
- 修改图片 URL
- 上传本地图片
- 设置菜品上架或下架
- 导入菜品 JSON
- 导出菜品 JSON
- 恢复 `src/data/dishes.json` 默认数据
- 查询后端集中保存的订单
- 查看订单姓名、提交时间、菜品明细、备注、数量和金额
- 手动刷新或清空订单

后台修改会保存到当前浏览器的 `localStorage`，点餐页会优先使用后台保存的菜品数据。点击“保存”后，当前浏览器里的点餐页面会立即使用最新菜单。

注意：管理员后台不带登录鉴权，也不会自动写回 `dishes.json` 文件。本地图片上传会把图片转成 `data URL` 保存在当前浏览器，不会上传到云端图片服务器。订单查询默认读取 `/api/orders` 后端；如果后端不可用，会显示当前浏览器里的本地测试订单。

## 如何配置订单后端

复制环境变量示例：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
VITE_ORDER_WEBHOOK_URL=/api/orders
KV_REST_API_URL=https://your-redis-url.upstash.io
KV_REST_API_TOKEN=your_redis_rest_token
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-bot-id
FEISHU_WEBHOOK_SECRET=your_feishu_sign_secret
```

`VITE_ORDER_WEBHOOK_URL` 留空时也会默认使用 `/api/orders`。`KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 用于服务端函数连接 Vercel KV / Upstash Redis，不能写成 `VITE_` 开头。

`FEISHU_WEBHOOK_URL` 用于把新订单推送到飞书群。如果飞书机器人开启了“签名校验”，还需要填写 `FEISHU_WEBHOOK_SECRET`；如果没有开启签名校验，可以不配置这个变量。

配置后，订单会通过 `fetch POST` 提交到 `/api/orders`，服务端会集中保存订单，并把订单推送到飞书。管理员后台的“订单查询”会通过 `GET /api/orders` 读取订单。

## 如何配置飞书机器人

1. 在飞书群里添加“自定义机器人”。
2. 复制机器人 Webhook 地址，填到 Vercel 环境变量 `FEISHU_WEBHOOK_URL`。
3. 如果机器人安全设置开启了“签名校验”，复制 Secret，填到 `FEISHU_WEBHOOK_SECRET`。
4. 重新部署 Vercel。
5. 客户提交订单后，飞书群会收到订单消息。

飞书消息示例：

```text
🍽️ 新订单

下单人：张三
提交时间：2026年6月18日 13:20
备注：不要辣

菜品：
- 辣子鸡 x 2 ¥84
- 柠檬冰茶 x 1 ¥12

合计：3 份，¥96
订单号：order-...
```

如果只配置飞书、不配置 KV，客户下单仍然可以推送到飞书群，但管理员后台的集中订单查询需要 KV / Redis 才能正常使用。

订单数据格式示例：

```json
{
  "customerName": "张三",
  "remark": "不要辣",
  "items": [
    {
      "dishId": "meat-spicy-chicken",
      "name": "辣子鸡",
      "category": "肉类",
      "price": 42,
      "quantity": 2,
      "subtotal": 84
    }
  ],
  "totalQuantity": 2,
  "totalAmount": 84,
  "createdAt": "2026-06-17T12:00:00.000Z",
  "source": "party-menu"
}
```

修改 `.env` 后需要重新启动开发服务器：

```bash
npm run dev
```

## 如何测试订单提交

本地只运行 `npm run dev` 时，Vite 不会启动 Vercel Serverless API。此时提交订单如果访问不到 `/api/orders`，会临时保存到当前浏览器的 `localStorage`，方便本地调试。

本地测试保存 key 为：

```text
party_menu_orders
```

部署到 Vercel 并配置 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 后，订单会保存到后端，管理员后台可以集中查询。

本地测试订单查看页面：

```text
party_menu_orders
```

```text
http://localhost:5175/#/orders
```

管理员后台订单查询页面：

```text
http://localhost:5175/#/admin
```

注意：`#/orders` 只用于本地测试。正式使用请部署到 Vercel，并配置后端 KV 环境变量。

## 如何部署到 Vercel

1. 将项目提交到 GitHub。
2. 打开 [Vercel](https://vercel.com/) 并导入该仓库。
3. Vercel 会自动识别 Vite 项目。
4. 构建命令使用：

```bash
npm run build
```

5. 输出目录使用：

```text
dist
```

6. 在 Vercel 项目的 Environment Variables 中添加：

```env
VITE_ORDER_WEBHOOK_URL=/api/orders
KV_REST_API_URL=https://your-redis-url.upstash.io
KV_REST_API_TOKEN=your_redis_rest_token
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-bot-id
FEISHU_WEBHOOK_SECRET=your_feishu_sign_secret
```

7. 重新部署后，订单会提交到 `/api/orders`，保存到 KV / Redis，并推送到飞书群。

## 如何生成二维码

项目内置二维码页面：

```text
#/qr
```

本地开发时访问：

```text
http://localhost:5175/#/qr
```

部署后访问：

```text
https://xxx.vercel.app/#/qr
```

二维码页面会自动读取当前网站域名，并生成点餐首页链接，例如：

```text
https://xxx.vercel.app/
```

页面提供：

- `复制点餐链接`
- `下载二维码`

## 如何给朋友扫码使用

推荐流程：

1. 先部署到 Vercel。
2. 打开部署后的网站二维码页面：`https://xxx.vercel.app/#/qr`。
3. 点击“下载二维码”，保存二维码图片。
4. 把二维码发到微信群、朋友圈，或投屏到电视上。
5. 朋友扫码后进入点餐首页。
6. 每个人选择菜品，填写姓名和备注后提交。
7. 订单会提交到 `/api/orders` 后端。
8. 聚会主人打开 `https://xxx.vercel.app/#/admin`，在“订单查询”里查看所有集中订单。

## 常见问题

### 1. 为什么订单没有发送出去？

请检查 Vercel 环境变量是否配置了：

```env
VITE_ORDER_WEBHOOK_URL=/api/orders
KV_REST_API_URL
KV_REST_API_TOKEN
FEISHU_WEBHOOK_URL
```

如果缺少 `KV_REST_API_URL` 或 `KV_REST_API_TOKEN`，管理员后台无法查询集中订单。如果只想先用飞书收单，至少需要配置 `FEISHU_WEBHOOK_URL`。

### 2. 修改 `.env` 后为什么没有生效？

Vite 只会在启动时读取环境变量。修改 `.env` 后，请重新运行：

```bash
npm run dev
```

### 3. 为什么手机打不开本地地址？

请确认：

- 手机和电脑在同一个 Wi-Fi。
- 使用的是 Vite 输出的 `Network` 地址，而不是 `localhost`。
- 电脑防火墙没有拦截该端口。

### 4. 为什么某个菜品没有显示？

请检查 `src/data/dishes.json` 中该菜品的：

```json
"isAvailable": true
```

只有 `isAvailable` 为 `true` 的菜品才会显示。

### 5. 如何调整菜品排序？

修改菜品的 `sortOrder`。数字越小，显示越靠前。

### 6. 如何替换菜品图片？

修改菜品的 `image` 字段为公开可访问的图片 URL。

### 7. `#/orders` 页面正式使用能看到所有人的订单吗？

不能。`#/orders` 只读取当前浏览器的 `localStorage`，只适合本地测试。正式使用请打开 `#/admin`，在“订单查询”里查看后端集中订单。

### 8. 部署后二维码应该发哪个？

部署后打开：

```text
https://xxx.vercel.app/#/qr
```

下载二维码图片后发给朋友即可。

## 构建

```bash
npm run build
```

构建产物会输出到：

```text
dist/
```
