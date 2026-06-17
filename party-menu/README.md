# party-menu

## 项目介绍

一个适合朋友聚会娱乐使用的扫码点餐纯前端网页项目。项目使用 React + Vite + Tailwind CSS 构建，不需要后端服务器；菜品数据保存在本地 JSON 文件中，订单可以提交到 Webhook。未配置 Webhook 时，会自动进入本地测试模式，把订单保存到当前浏览器的 `localStorage`。

## 功能说明

- 手机端优先的点餐页面，适合朋友扫码访问。
- 顶部展示餐厅欢迎语和聚会氛围背景。
- 菜品按分类展示，分类 Tab 支持横向滚动。
- 只展示 `isAvailable: true` 的菜品，并按 `sortOrder` 排序。
- 菜品支持 `+` / `-` 修改数量，数量为 0 时自动从购物车移除。
- 底部固定购物车栏，显示已选数量、查看购物车和去提交按钮。
- 购物车抽屉从底部弹出，支持增减数量、删除菜品。
- 提交订单时填写朋友姓名和备注。
- 支持 Webhook 提交订单。
- 未配置 Webhook 时支持本地测试订单查看页面。
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
- `isAvailable`：是否可点，`true` 会显示，`false` 不显示。
- `sortOrder`：排序值，数字越小越靠前。

修改保存后，开发环境会自动刷新页面。

## 如何配置 Webhook

复制环境变量示例：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
VITE_ORDER_WEBHOOK_URL=https://your-webhook.example/order
```

配置后，订单会通过 `fetch POST` 提交到该 Webhook，`Content-Type` 为 `application/json`。

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
      "quantity": 2
    }
  ],
  "totalQuantity": 2,
  "createdAt": "2026-06-17T12:00:00.000Z",
  "source": "party-menu"
}
```

修改 `.env` 后需要重新启动开发服务器：

```bash
npm run dev
```

## 如何测试订单提交

如果没有配置 `VITE_ORDER_WEBHOOK_URL`，项目会进入测试模式。

测试模式下：

- 页面顶部会显示“测试模式，订单只保存在当前浏览器”。
- 订单会保存到当前浏览器的 `localStorage`。
- 保存 key 为：

```text
party_menu_orders
```

查看本地测试订单：

```text
http://localhost:5175/#/orders
```

在这个页面可以查看本地测试订单列表，也可以清空本地测试订单。

注意：`#/orders` 只用于未配置 Webhook 时的本地测试。正式使用时，订单应该发送到 Webhook，由聚会主人或自动化工具接收。

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

6. 如果需要正式提交订单，在 Vercel 项目的 Environment Variables 中添加：

```env
VITE_ORDER_WEBHOOK_URL=https://your-webhook.example/order
```

7. 重新部署后，订单会提交到 Webhook。

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
7. 如果配置了 Webhook，订单会推送给聚会主人。
8. 如果没有配置 Webhook，订单只会保存在提交者当前浏览器中，适合本地测试。

## 常见问题

### 1. 为什么订单没有发送出去？

请检查是否配置了：

```env
VITE_ORDER_WEBHOOK_URL
```

如果没有配置，项目会进入测试模式，订单只保存到当前浏览器。

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

不能。`#/orders` 只读取当前浏览器的 `localStorage`，只适合本地测试。正式使用请配置 Webhook。

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
