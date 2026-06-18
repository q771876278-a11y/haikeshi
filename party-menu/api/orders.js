import crypto from 'node:crypto';
import { createClient } from 'redis';

const ORDER_KEY = 'party_menu_orders';
const FEISHU_CONFIG_KEY = 'party_menu_feishu_config';
const MAX_ORDERS = 500;

function getRedisConfig() {
  return {
    redisUrl: process.env.REDIS_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  };
}

function getFeishuConfig() {
  return {
    secret: process.env.FEISHU_WEBHOOK_SECRET || '',
    url: process.env.FEISHU_WEBHOOK_URL || '',
  };
}

function hasRedisConfig() {
  const { redisUrl, token, url } = getRedisConfig();
  return Boolean(redisUrl || (token && url));
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function redis(command) {
  const { redisUrl, token, url } = getRedisConfig();

  if (token && url) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.error) {
      const error = new Error(payload.error || `Redis 请求失败：${response.status}`);
      error.statusCode = 500;
      throw error;
    }

    return payload.result;
  }

  if (!redisUrl) {
    const error = new Error('订单后端未配置 KV_REST_API_URL / KV_REST_API_TOKEN 或 REDIS_URL。');
    error.statusCode = 500;
    throw error;
  }

  const client = createClient({ url: redisUrl });
  await client.connect();

  try {
    const [name, ...args] = command;
    const commandName = String(name).toUpperCase();

    if (commandName === 'GET') {
      return client.get(args[0]);
    }
    if (commandName === 'SET') {
      return client.set(args[0], args[1]);
    }
    if (commandName === 'DEL') {
      return client.del(args[0]);
    }
    if (commandName === 'LPUSH') {
      return client.lPush(args[0], args[1]);
    }
    if (commandName === 'LTRIM') {
      return client.lTrim(args[0], Number(args[1]), Number(args[2]));
    }
    if (commandName === 'LRANGE') {
      return client.lRange(args[0], Number(args[1]), Number(args[2]));
    }

    throw new Error(`不支持的 Redis 命令：${commandName}`);
  } finally {
    await client.disconnect();
  }
}

async function readStoredFeishuConfig() {
  if (!hasRedisConfig()) {
    return { secret: '', url: '' };
  }

  const rawConfig = await redis(['GET', FEISHU_CONFIG_KEY]);
  if (!rawConfig) {
    return { secret: '', url: '' };
  }

  try {
    const config = JSON.parse(rawConfig);
    return {
      secret: config.secret || '',
      url: config.url || '',
    };
  } catch {
    return { secret: '', url: '' };
  }
}

function createFeishuSign(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', stringToSign).update('').digest('base64');
}

function formatFeishuOrder(order) {
  const itemLines = order.items.map((item) => {
    const subtotal = typeof item.subtotal === 'number' ? ` ¥${item.subtotal}` : '';
    return `- ${item.name} x ${item.quantity}${subtotal}`;
  });

  return [
    '🍽️ 新订单',
    '',
    `下单人：${order.customerName}`,
    `提交时间：${new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Shanghai',
    }).format(new Date(order.createdAt))}`,
    `备注：${order.remark || '无'}`,
    '',
    '菜品：',
    ...itemLines,
    '',
    `合计：${order.totalQuantity} 份，¥${order.totalAmount}`,
    '',
    `订单号：${order.id}`,
  ].join('\n');
}

async function sendOrderToFeishu(order) {
  const envConfig = getFeishuConfig();
  const storedConfig = envConfig.url ? { secret: '', url: '' } : await readStoredFeishuConfig();
  const secret = envConfig.secret || storedConfig.secret;
  const url = envConfig.url || storedConfig.url;

  if (!url) {
    return { configured: false, sent: false };
  }

  const body = {
    msg_type: 'text',
    content: {
      text: formatFeishuOrder(order),
    },
  };

  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    body.timestamp = timestamp;
    body.sign = createFeishuSign(timestamp, secret);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  const feishuCode = payload.code ?? payload.StatusCode ?? 0;

  if (!response.ok || feishuCode !== 0) {
    throw new Error(payload.msg || payload.StatusMessage || `飞书返回 ${response.status}`);
  }

  return { configured: true, sent: true };
}

function validateOrder(order) {
  if (!order || typeof order !== 'object') {
    return '订单数据不能为空。';
  }

  if (!String(order.customerName || '').trim()) {
    return '朋友姓名不能为空。';
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return '订单菜品不能为空。';
  }

  if (order.items.some((item) => Number(item.quantity) <= 0)) {
    return '菜品数量必须大于 0。';
  }

  return '';
}

function normalizeOrder(order) {
  const items = order.items.map((item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;

    return {
      dishId: item.dishId,
      name: item.name,
      category: item.category,
      price,
      quantity,
      subtotal: Number(item.subtotal) || price * quantity,
    };
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: `order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customerName: String(order.customerName || '').trim(),
    remark: String(order.remark || '').trim(),
    items,
    totalQuantity,
    totalAmount,
    createdAt: order.createdAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    source: order.source || 'party-menu',
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  try {
    if (req.method === 'GET') {
      if (!hasRedisConfig()) {
        json(res, 500, {
          success: false,
          message: '订单查询需要配置 KV_REST_API_URL / KV_REST_API_TOKEN。',
        });
        return;
      }

      const rawOrders = await redis(['LRANGE', ORDER_KEY, '0', String(MAX_ORDERS - 1)]);
      const orders = (rawOrders || [])
        .map((item) => {
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      json(res, 200, { success: true, orders });
      return;
    }

    if (req.method === 'POST') {
      const order = await readBody(req);
      const validationMessage = validateOrder(order);

      if (validationMessage) {
        json(res, 400, { success: false, message: validationMessage });
        return;
      }

      const savedOrder = normalizeOrder(order);
      let savedToStore = false;
      let feishuSent = false;
      let feishuError = '';

      if (hasRedisConfig()) {
        await redis(['LPUSH', ORDER_KEY, JSON.stringify(savedOrder)]);
        await redis(['LTRIM', ORDER_KEY, '0', String(MAX_ORDERS - 1)]);
        savedToStore = true;
      }

      try {
        const feishuResult = await sendOrderToFeishu(savedOrder);
        feishuSent = feishuResult.sent;
      } catch (error) {
        console.error('飞书推送失败:', error);
        feishuError = error.message || '飞书推送失败';
      }

      if (!savedToStore && !feishuSent) {
        json(res, 500, {
          success: false,
          message: feishuError || '未配置订单存储或飞书 Webhook。',
        });
        return;
      }

      json(res, 200, {
        success: true,
        message: feishuError
          ? '订单已保存，飞书推送失败，请检查机器人配置。'
          : feishuSent
            ? '订单已提交，管理员后台和飞书可查看。'
            : '订单已提交，管理员后台可查看。',
        feishuSent,
        order: savedOrder,
      });
      return;
    }

    if (req.method === 'DELETE') {
      if (!hasRedisConfig()) {
        json(res, 500, {
          success: false,
          message: '清空后端订单需要配置 KV_REST_API_URL / KV_REST_API_TOKEN。',
        });
        return;
      }

      await redis(['DEL', ORDER_KEY]);
      json(res, 200, { success: true, message: '订单已清空。' });
      return;
    }

    json(res, 405, { success: false, message: '不支持的请求方法。' });
  } catch (error) {
    console.error('订单 API 错误:', error);
    json(res, error.statusCode || 500, {
      success: false,
      message: error.message || '订单服务异常。',
    });
  }
}
