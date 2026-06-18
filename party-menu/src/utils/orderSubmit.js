import { saveOrderToStorage } from './storage';

const orderEndpoint = import.meta.env.VITE_ORDER_WEBHOOK_URL?.trim() || '/api/orders';
const isDefaultOrderApi = orderEndpoint === '/api/orders';

export function hasWebhook() {
  return Boolean(orderEndpoint);
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
  try {
    const response = await fetch(orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });

    const payload = await response.json().catch(() => ({}));

    if (
      !response.ok ||
      payload.success === false ||
      (isDefaultOrderApi && payload.success !== true)
    ) {
      throw new Error(payload.message || `订单后端返回 ${response.status}`);
    }

    return {
      success: true,
      mode: orderEndpoint,
      message: payload.message || '订单已提交，管理员后台可查看。',
    };
  } catch (error) {
    console.error('订单提交失败:', error);

    if (isDefaultOrderApi && window.location.hostname === 'localhost') {
      saveOrderToStorage(order);
      return {
        success: true,
        mode: 'localStorage',
        message: '本地开发订单已保存。',
      };
    }

    throw new Error(error.message || 'Webhook 提交失败');
  }
}
