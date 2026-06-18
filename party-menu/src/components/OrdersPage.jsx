import { ArrowLeft, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearStoredOrders, readStoredOrders } from '../utils/storage';

function formatTime(value) {
  if (!value) {
    return '未知时间';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatAmount(value) {
  return typeof value === 'number' ? `¥${value}` : '未记录';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(readStoredOrders());
  }, []);

  function handleClear() {
    clearStoredOrders();
    setOrders([]);
  }

  return (
    <main className="min-h-screen bg-rice text-ink">
      <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 sm:px-6">
        <header className="rounded-lg bg-white p-4 shadow-lift">
          <a
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
            href="#/"
          >
            <ArrowLeft size={17} />
            返回点餐
          </a>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-500">本地测试订单</p>
              <h1 className="mt-1 text-2xl font-bold">测试订单列表</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                仅读取当前浏览器中的 party_menu_orders。
              </p>
            </div>
            <button
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={orders.length === 0}
              onClick={handleClear}
              type="button"
            >
              <Trash2 size={16} />
              清空
            </button>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm font-semibold text-stone-600">
            暂无本地测试订单
          </div>
        ) : (
          <section className="space-y-3" aria-label="本地测试订单列表">
            {orders.map((order, index) => (
              <article className="rounded-lg bg-white p-4 shadow-sm" key={`${order.createdAt}-${index}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{order.customerName || '未填写姓名'}</h2>
                    <p className="mt-1 text-sm text-stone-500">{formatTime(order.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-rice px-3 py-1 text-sm font-bold text-leaf">
                    {order.totalQuantity || 0} 份 · {formatAmount(order.totalAmount)}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items || []).map((item) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg bg-rice px-3 py-2"
                      key={`${item.dishId}-${item.name}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="text-sm text-stone-600">
                          {item.category}
                          {typeof item.price === 'number' ? ` · ¥${item.price}` : ''}
                        </p>
                      </div>
                      <strong className="shrink-0 text-sm">
                        {item.quantity} 份
                        {typeof item.subtotal === 'number' ? ` · ¥${item.subtotal}` : ''}
                      </strong>
                    </div>
                  ))}
                </div>

                <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-600">
                  备注：{order.remark || '无'}
                </p>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
