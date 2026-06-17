export const ORDER_STORAGE_KEY = 'party_menu_orders';

export function readStoredOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveOrderToStorage(order) {
  const orders = readStoredOrders();
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([order, ...orders]));
}

export function clearStoredOrders() {
  localStorage.removeItem(ORDER_STORAGE_KEY);
}
