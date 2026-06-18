import crypto from 'node:crypto';
import { createClient } from 'redis';

const FEISHU_CONFIG_KEY = 'party_menu_feishu_config';

function getRedisConfig() {
  return {
    redisUrl: process.env.REDIS_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  };
}

function getEnvFeishuConfig() {
  return {
    secret: process.env.FEISHU_WEBHOOK_SECRET || '',
    url: process.env.FEISHU_WEBHOOK_URL || '',
  };
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

function hasRedisConfig() {
  const { redisUrl, token, url } = getRedisConfig();
  return Boolean(redisUrl || (token && url));
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
    const error = new Error('飞书一键部署需要先配置 KV_REST_API_URL / KV_REST_API_TOKEN 或 REDIS_URL。');
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

    throw new Error(`不支持的 Redis 命令：${commandName}`);
  } finally {
    await client.quit();
  }
}

function assertAdminToken(adminToken) {
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;

  if (!expectedToken) {
    const error = new Error('未配置 ADMIN_SETUP_TOKEN，不能从后台保存飞书配置。');
    error.statusCode = 500;
    throw error;
  }

  if (adminToken !== expectedToken) {
    const error = new Error('管理员部署口令不正确。');
    error.statusCode = 401;
    throw error;
  }
}

function createFeishuSign(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', stringToSign).update('').digest('base64');
}

async function sendFeishuTestMessage({ secret, url }) {
  const body = {
    msg_type: 'text',
    content: {
      text: [
        '✅ 阳阳餐厅飞书机器人已连接',
        '',
        '现在客户下单后，订单会自动推送到这个飞书群。',
      ].join('\n'),
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  try {
    if (req.method === 'GET') {
      const envConfig = getEnvFeishuConfig();
      const storedConfig = await readStoredFeishuConfig();

      json(res, 200, {
        success: true,
        adminTokenRequired: Boolean(process.env.ADMIN_SETUP_TOKEN),
        configured: Boolean(envConfig.url || storedConfig.url),
        envConfigured: Boolean(envConfig.url),
        kvConfigured: hasRedisConfig(),
        storedConfigured: Boolean(storedConfig.url),
        signed: Boolean(envConfig.secret || storedConfig.secret),
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      assertAdminToken(body.adminToken);

      const url = String(body.webhookUrl || '').trim();
      const secret = String(body.secret || '').trim();

      if (!url.startsWith('https://')) {
        json(res, 400, { success: false, message: '请填写 https 开头的飞书 Webhook 地址。' });
        return;
      }

      await redis([
        'SET',
        FEISHU_CONFIG_KEY,
        JSON.stringify({
          secret,
          updatedAt: new Date().toISOString(),
          url,
        }),
      ]);

      await sendFeishuTestMessage({ secret, url });

      json(res, 200, {
        success: true,
        message: '飞书已连接，测试消息已发送。',
      });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      assertAdminToken(body.adminToken);
      await redis(['DEL', FEISHU_CONFIG_KEY]);
      json(res, 200, { success: true, message: '已清除后台保存的飞书配置。' });
      return;
    }

    json(res, 405, { success: false, message: '不支持的请求方法。' });
  } catch (error) {
    console.error('飞书配置 API 错误:', error);
    json(res, error.statusCode || 500, {
      success: false,
      message: error.message || '飞书配置服务异常。',
    });
  }
}
