import { useEffect, useMemo, useState } from 'react';
import { PartyPopper, QrCode, Sparkles } from 'lucide-react';
import AdminPage from './components/AdminPage';
import CartBar from './components/CartBar';
import CartDrawer from './components/CartDrawer';
import CategoryTabs from './components/CategoryTabs';
import DishCard from './components/DishCard';
import OrderFormModal from './components/OrderFormModal';
import OrdersPage from './components/OrdersPage';
import QrPage from './components/QrPage';
import SuccessModal from './components/SuccessModal';
import defaultDishes from './data/dishes.json';
import { createOrder, submitOrder } from './utils/orderSubmit';
import { readStoredDishes } from './utils/storage';

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [cart, setCart] = useState({});
  const [dishes, setDishes] = useState(() => readStoredDishes(defaultDishes));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [successTip, setSuccessTip] = useState('');

  const funTips = [
    '菜单已送达，今晚你负责吃！',
    '收到！厨神正在赶来的路上。',
    '点餐成功，准备开饭！',
    '你的胃已经成功预约。',
    '好的，今晚这桌有你一份。',
  ];

  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash || '#/');
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const availableDishes = useMemo(
    () => dishes.filter((dish) => dish.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder),
    [dishes],
  );

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(availableDishes.map((dish) => dish.category)))],
    [availableDishes],
  );

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('全部');
    }
  }, [activeCategory, categories]);

  const filteredDishes = useMemo(() => {
    if (activeCategory === '全部') {
      return availableDishes;
    }
    return availableDishes.filter((dish) => dish.category === activeCategory);
  }, [activeCategory, availableDishes]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([dishId, quantity]) => {
          const dish = availableDishes.find((item) => item.id === dishId);
          return dish ? { ...dish, quantity } : null;
        })
        .filter(Boolean),
    [availableDishes, cart],
  );

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0,
  );
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
    if (!availableDishes.some((dish) => dish.id === dishId)) {
      return;
    }
    updateQuantity(dishId, (cart[dishId] || 0) + 1);
  }

  function removeDish(dishId) {
    updateQuantity(dishId, (cart[dishId] || 0) - 1);
  }

  function deleteDish(dishId) {
    updateQuantity(dishId, 0);
  }

  function openOrderForm() {
    if (cartItems.length === 0) {
      setStatus({ type: 'error', message: '请先选择几道菜。' });
      return;
    }

    setFormError('');
    setDrawerOpen(false);
    setOrderFormOpen(true);
  }

  async function handleSubmitOrder({ customerName, remark }) {
    if (isSubmitting) {
      return;
    }

    if (cartItems.length === 0) {
      setFormError('购物车为空，不能提交。');
      return;
    }

    if (!customerName.trim()) {
      setFormError('请填写朋友姓名。');
      return;
    }

    if (cartItems.some((item) => item.quantity <= 0)) {
      setFormError('菜品数量必须大于 0。');
      return;
    }

    const order = createOrder({
      customerName,
      remark,
      items: cartItems,
      totalAmount,
      totalQuantity,
    });

    setFormError('');
    setStatus({ type: 'submitting', message: '正在提交订单...' });

    try {
      const result = await submitOrder(order);
      setCart({});
      setDrawerOpen(false);
      setOrderFormOpen(false);
      setStatus({ type: 'success', message: result.message });
      setSuccessMessage(result.message);
      setSuccessTip(funTips[Math.floor(Math.random() * funTips.length)]);
    } catch (error) {
      setStatus({ type: 'error', message: `提交失败：${error.message}` });
      setFormError(`提交失败：${error.message}`);
    }
  }

  if (route === '#/orders') {
    return <OrdersPage />;
  }

  if (route === '#/qr') {
    return <QrPage />;
  }

  if (route === '#/admin') {
    return (
      <AdminPage
        defaultDishes={defaultDishes}
        dishes={dishes}
        onDishesChange={setDishes}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ec_0%,#fffdfa_46%,#fff1df_100%)] text-ink">
      <section className="mx-auto w-full max-w-[480px] space-y-4 px-3 pb-32 pt-3 sm:px-4">
        <header className="overflow-hidden rounded-lg border border-white/70 bg-white shadow-lift">
          <div className="relative min-h-[230px]">
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80"
              alt="朋友聚餐桌面"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,25,21,0.10),rgba(32,25,21,0.88))]" />
            <div className="relative flex min-h-[230px] flex-col justify-between p-4 text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-semibold backdrop-blur">
                  <PartyPopper size={16} />
                  朋友局菜单
                </span>
                <div className="flex items-center gap-2">
                  <a
                    aria-label="查看二维码"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/18 text-white backdrop-blur transition active:scale-95"
                    href="#/qr"
                  >
                    <QrCode size={18} />
                  </a>
                </div>
              </div>

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  <Sparkles size={14} />
                  今晚菜单已备好
                </div>
                <h1 className="text-[1.85rem] font-bold leading-tight tracking-normal">阳阳餐厅欢迎您！</h1>
                <p className="mt-2 text-[1rem] leading-6 text-white/90">朋友聚会娱乐点餐</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2" aria-label="点餐概览">
          <div className="rounded-lg border border-white bg-white/90 p-3 shadow-sm">
            <p className="text-xs font-bold text-stone-500">可点</p>
            <p className="mt-1 text-xl font-bold text-ink">{availableDishes.length}</p>
          </div>
          <div className="rounded-lg border border-white bg-white/90 p-3 shadow-sm">
            <p className="text-xs font-bold text-stone-500">已选</p>
            <p className="mt-1 text-xl font-bold text-tomato">{totalQuantity}</p>
          </div>
          <div className="rounded-lg border border-white bg-white/90 p-3 shadow-sm">
            <p className="text-xs font-bold text-stone-500">分类</p>
            <p className="mt-1 truncate text-xl font-bold text-leaf">{activeCategory}</p>
          </div>
        </section>

        <CategoryTabs
          activeCategory={activeCategory}
          categories={categories}
          onChange={setActiveCategory}
        />

        <section className="grid gap-3" aria-label="菜品列表">
          {filteredDishes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm font-semibold leading-6 text-stone-600 shadow-sm">
              这个分类暂时没有可点菜品，先看看别的好吃的。
            </div>
          ) : (
            filteredDishes.map((dish) => (
              <DishCard
                dish={dish}
                key={dish.id}
                onAdd={() => addDish(dish.id)}
                onRemove={() => removeDish(dish.id)}
                quantity={cart[dish.id] || 0}
              />
            ))
          )}
        </section>
      </section>

      <CartBar
        isSubmitting={isSubmitting}
        onOpenCart={() => setDrawerOpen(true)}
        onOpenSubmit={openOrderForm}
        status={status}
        totalAmount={totalAmount}
        totalQuantity={totalQuantity}
      />

      <CartDrawer
        cartItems={cartItems}
        onClose={() => setDrawerOpen(false)}
        onDecrease={removeDish}
        onDelete={deleteDish}
        onIncrease={addDish}
        open={drawerOpen}
        totalAmount={totalAmount}
        totalQuantity={totalQuantity}
      />

      <OrderFormModal
        errorMessage={formError}
        isSubmitting={isSubmitting}
        onClose={() => setOrderFormOpen(false)}
        onSubmit={handleSubmitOrder}
        open={orderFormOpen}
        totalAmount={totalAmount}
        totalQuantity={totalQuantity}
      />

      <SuccessModal
        message={successMessage}
        onClose={() => {
          setSuccessMessage('');
          setSuccessTip('');
        }}
        open={Boolean(successMessage)}
        tip={successTip}
      />
    </main>
  );
}
