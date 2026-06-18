import { saveOrderToStorage } from './storage';

const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL?.trim();

export function hasWebhook() {
  return Boolean(webhookUrl);
}

export function createOrder({ customerName, remark, items, totalAmount, totalQuantity }) {
  return {
    customerName: customerName.trim(),
    remark: remark.trim(),
    items: items.map(({ id, name, category, price, quantity }) => {
      const unitPrice = Number(price) || 0;
      return {
        dishId: id,
        name,
        category,
        price: unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      };
    }),
    totalQuantity,
    totalAmount,
    createdAt: new Date().toISOString(),
    source: 'party-menu',
  };
}

export async function submitOrder(order) {
  if (!hasWebhook()) {
    saveOrderToStorage(order);
    return {
      success: true,
      mode: 'localStorage',
      message: '测试订单已保存到本机浏览器。',
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error(`Webhook 返回 ${response.status}`);
    }

    return {
      success: true,
      mode: 'webhook',
      message: '订单已发送，准备开吃。',
    };
  } catch (error) {
    console.error('订单提交失败:', error);
    throw new Error(error.message || 'Webhook 提交失败');
  }
}
