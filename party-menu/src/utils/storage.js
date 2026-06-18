export const ORDER_STORAGE_KEY = 'party_menu_orders';
export const DISH_STORAGE_KEY = 'party_menu_dishes';

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

export function readStoredDishes(defaultDishes) {
  try {
    const saved = JSON.parse(localStorage.getItem(DISH_STORAGE_KEY) || 'null');
    if (!Array.isArray(saved)) {
      return defaultDishes;
    }

    return saved;
  } catch {
    return defaultDishes;
  }
}

export function saveDishesToStorage(dishes) {
  localStorage.setItem(DISH_STORAGE_KEY, JSON.stringify(dishes));
}

export function clearStoredDishes() {
  localStorage.removeItem(DISH_STORAGE_KEY);
}
