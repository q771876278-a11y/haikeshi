import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import dishes from './data/dishes.json';

const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL?.trim();
const storageKey = 'party-qr-orders';

function currency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);
}

function App() {
  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(dishes.map((dish) => dish.category)))],
    [],
  );
  const [activeCategory, setActiveCategory] = useState('全部');
  const [cart, setCart] = useState({});
  const [guestName, setGuestName] = useState('');
  const [tableName, setTableName] = useState('朋友桌');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const filteredDishes = useMemo(() => {
    if (activeCategory === '全部') {
      return dishes;
    }
    return dishes.filter((dish) => dish.category === activeCategory);
  }, [activeCategory]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([dishId, quantity]) => {
          const dish = dishes.find((item) => item.id === dishId);
          return dish ? { ...dish, quantity, subtotal: dish.price * quantity } : null;
        })
        .filter(Boolean),
    [cart],
  );

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const isTestMode = !webhookUrl;
  const isSubmitting = status.type === 'submitting';

  function updateQuantity(dishId, nextQuantity) {
    setStatus({ type: 'idle', message: '' });
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[dishId];
      } else {
        next[dishId] = nextQuantity;
      }
      return next;
    });
  }

  function addDish(dishId) {
    updateQuantity(dishId, (cart[dishId] || 0) + 1);
  }

  function removeDish(dishId) {
    updateQuantity(dishId, (cart[dishId] || 0) - 1);
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (cartItems.length === 0) {
      setStatus({ type: 'error', message: '请先选择几道菜。' });
      return;
    }

    const order = {
      id: `order-${Date.now()}`,
      tableName: tableName.trim() || '朋友桌',
      guestName: guestName.trim() || '匿名朋友',
      note: note.trim(),
      items: cartItems.map(({ id, name, price, quantity, subtotal }) => ({
        id,
        name,
        price,
        quantity,
        subtotal,
      })),
      totalQuantity,
      totalPrice,
      mode: isTestMode ? 'localStorage' : 'webhook',
      createdAt: new Date().toISOString(),
    };

    setStatus({ type: 'submitting', message: '正在提交订单...' });

    try {
      if (isTestMode) {
        const savedOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([order, ...savedOrders]));
      } else {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        });

        if (!response.ok) {
          throw new Error(`Webhook 返回 ${response.status}`);
        }
      }

      setCart({});
      setNote('');
      setStatus({
        type: 'success',
        message: isTestMode
          ? '测试订单已保存到本机浏览器。'
          : '订单已发送，准备开吃。',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `提交失败：${error.message}`,
      });
    }
  }

  return (
    <main className="min-h-screen bg-rice text-ink">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-10 lg:pt-8">
        <div className="space-y-5">
          <header className="overflow-hidden rounded-lg bg-ink text-white shadow-lift">
            <div className="relative min-h-[210px]">
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-55"
                src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80"
                alt="朋友聚餐桌面"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,33,28,0.82),rgba(23,33,28,0.38))]" />
              <div className="relative flex min-h-[210px] flex-col justify-between p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-sm backdrop-blur">
                    <Sparkles size={16} />
                    聚会菜单
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">
                    {isTestMode ? '测试模式' : 'Webhook'}
                  </span>
                </div>
                <div className="max-w-xl">
                  <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
                    扫码点餐
                  </h1>
                  <p className="mt-3 max-w-[26rem] text-base leading-7 text-white/88 sm:text-lg">
                    朋友各自下单，最后统一提交到聚会订单。
                  </p>
                </div>
              </div>
            </div>
          </header>

          <nav className="no-scrollbar flex gap-2 overflow-x-auto py-1" aria-label="菜品分类">
            {categories.map((category) => (
              <button
                key={category}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category
                    ? 'border-leaf bg-leaf text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </nav>

          <section className="grid gap-3 sm:grid-cols-2" aria-label="菜品列表">
            {filteredDishes.map((dish) => {
              const quantity = cart[dish.id] || 0;

              return (
                <article
                  className="grid grid-cols-[112px_1fr] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
                  key={dish.id}
                >
                  <img
                    className="h-full min-h-[146px] w-full object-cover"
                    src={dish.image}
                    alt={dish.name}
                    loading="lazy"
                  />
                  <div className="flex min-w-0 flex-col justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-bold leading-snug">{dish.name}</h2>
                        <span className="shrink-0 rounded-full bg-rice px-2 py-1 text-xs font-semibold text-chili">
                          {dish.tag}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">
                        {dish.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-lg text-chili">{currency(dish.price)}</strong>
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-rice p-1">
                          <IconButton
                            ariaLabel={`减少 ${dish.name}`}
                            onClick={() => removeDish(dish.id)}
                          >
                            <Minus size={16} />
                          </IconButton>
                          <span className="min-w-6 text-center text-sm font-bold">{quantity}</span>
                          <IconButton
                            ariaLabel={`增加 ${dish.name}`}
                            onClick={() => addDish(dish.id)}
                          >
                            <Plus size={16} />
                          </IconButton>
                        </div>
                      ) : (
                        <button
                          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-white transition active:scale-95"
                          onClick={() => addDish(dish.id)}
                          type="button"
                        >
                          <Plus size={16} />
                          加入
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        <aside className="hidden lg:block">
          <OrderPanel
            cartItems={cartItems}
            guestName={guestName}
            isSubmitting={isSubmitting}
            isTestMode={isTestMode}
            note={note}
            onClear={() => setCart({})}
            onGuestNameChange={setGuestName}
            onNoteChange={setNote}
            onRemoveDish={removeDish}
            onSubmit={submitOrder}
            onTableNameChange={setTableName}
            status={status}
            tableName={tableName}
            totalPrice={totalPrice}
            totalQuantity={totalQuantity}
          />
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/96 p-3 shadow-[0_-10px_30px_rgba(23,33,28,0.10)] backdrop-blur lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf text-white">
                <ShoppingBag size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-600">
                  {totalQuantity} 份菜品
                </p>
                <p className="truncate text-xl font-bold text-ink">{currency(totalPrice)}</p>
              </div>
            </div>
            <ChevronDown className="transition group-open:rotate-180" size={22} />
          </summary>
          <div className="max-h-[72vh] overflow-y-auto pt-3">
            <OrderPanel
              cartItems={cartItems}
              compact
              guestName={guestName}
              isSubmitting={isSubmitting}
              isTestMode={isTestMode}
              note={note}
              onClear={() => setCart({})}
              onGuestNameChange={setGuestName}
              onNoteChange={setNote}
              onRemoveDish={removeDish}
              onSubmit={submitOrder}
              onTableNameChange={setTableName}
              status={status}
              tableName={tableName}
              totalPrice={totalPrice}
              totalQuantity={totalQuantity}
            />
          </div>
        </details>
      </div>
    </main>
  );
}

function OrderPanel({
  cartItems,
  compact = false,
  guestName,
  isSubmitting,
  isTestMode,
  note,
  onClear,
  onGuestNameChange,
  onNoteChange,
  onRemoveDish,
  onSubmit,
  onTableNameChange,
  status,
  tableName,
  totalPrice,
  totalQuantity,
}) {
  return (
    <form
      className={`rounded-lg border border-stone-200 bg-white shadow-lift ${
        compact ? 'p-3 shadow-none' : 'sticky top-8 p-4'
      }`}
      onSubmit={onSubmit}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-500">当前订单</p>
          <h2 className="text-2xl font-bold">{currency(totalPrice)}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rice px-3 py-1 text-sm font-semibold text-leaf">
          <ReceiptText size={16} />
          {totalQuantity} 份
        </span>
      </div>

      <div className="space-y-2">
        {cartItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-rice p-4 text-center text-sm text-stone-600">
            购物袋还是空的。
          </div>
        ) : (
          cartItems.map((item) => (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-rice p-3" key={item.id}>
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-sm text-stone-600">
                  {item.quantity} x {currency(item.price)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <strong>{currency(item.subtotal)}</strong>
                <IconButton ariaLabel={`移除 ${item.name}`} onClick={() => onRemoveDish(item.id)}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          桌号/聚会名
          <input
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            onChange={(event) => onTableNameChange(event.target.value)}
            value={tableName}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          点餐人
          <input
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            onChange={(event) => onGuestNameChange(event.target.value)}
            placeholder="你的名字"
            value={guestName}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          备注
          <textarea
            className="min-h-[76px] resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="少辣、不要香菜、一起上..."
            value={note}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-full border border-stone-200 px-4 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={cartItems.length === 0 || isSubmitting}
          onClick={onClear}
          type="button"
        >
          <Trash2 size={16} />
          清空
        </button>
        <button
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-chili px-4 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={cartItems.length === 0 || isSubmitting}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          提交订单
        </button>
      </div>

      <p className="mt-3 flex min-h-6 items-start gap-2 text-sm text-stone-600">
        {status.type === 'success' && <CheckCircle2 className="mt-0.5 shrink-0 text-leaf" size={17} />}
        {status.message ||
          (isTestMode ? '未配置 Webhook，当前会保存到 localStorage。' : '订单将发送到配置的 Webhook。')}
      </p>
    </form>
  );
}

function IconButton({ ariaLabel, children, onClick }) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-sm transition active:scale-95"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default App;
