import {
  ArrowLeft,
  Bot,
  ClipboardList,
  Download,
  ImagePlus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ORDER_CHANGE_EVENT,
  ORDER_STORAGE_KEY,
  clearStoredDishes,
  clearStoredOrders,
  readStoredOrders,
  saveDishesToStorage,
} from '../utils/storage';

const orderApiEndpoint = import.meta.env.VITE_ORDER_WEBHOOK_URL?.trim() || '/api/orders';
const feishuApiEndpoint = '/api/feishu';

function normalizeDish(dish) {
  return {
    ...dish,
    id: String(dish.id || `dish-${Date.now()}`).trim(),
    name: String(dish.name || '').trim(),
    category: String(dish.category || '').trim() || '未分类',
    image: String(dish.image || '').trim(),
    description: String(dish.description || '').trim(),
    price: Math.max(0, Number(dish.price) || 0),
    sortOrder: Number(dish.sortOrder) || 0,
    isAvailable: Boolean(dish.isAvailable),
  };
}

function createBlankDish(existingDishes) {
  const maxSortOrder = existingDishes.reduce(
    (max, dish) => Math.max(max, Number(dish.sortOrder) || 0),
    0,
  );

  return {
    id: `dish-${Date.now()}`,
    name: '新菜品',
    category: '主食',
    image: 'https://placehold.co/900x700?text=New+Dish',
    description: '这里填写菜品描述。',
    price: 0,
    isAvailable: true,
    sortOrder: maxSortOrder + 1,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

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

export default function AdminPage({ defaultDishes, dishes, onDishesChange }) {
  const [activePanel, setActivePanel] = useState('dishes');
  const [draftDishes, setDraftDishes] = useState(dishes.map(normalizeDish));
  const [selectedId, setSelectedId] = useState(dishes[0]?.id || '');
  const [orders, setOrders] = useState(() => readStoredOrders());
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSource, setOrderSource] = useState('backend');
  const [feishuStatus, setFeishuStatus] = useState({
    adminTokenRequired: false,
    configured: false,
    envConfigured: false,
    kvConfigured: false,
    signed: false,
    storedConfigured: false,
  });
  const [feishuForm, setFeishuForm] = useState({
    adminToken: '',
    secret: '',
    webhookUrl: '',
  });
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [message, setMessage] = useState('');
  const importInputRef = useRef(null);

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(draftDishes.map((dish) => dish.category).filter(Boolean)))],
    [draftDishes],
  );

  const sortedDishes = useMemo(
    () => [...draftDishes].sort((a, b) => a.sortOrder - b.sortOrder),
    [draftDishes],
  );

  const visibleDishes = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return sortedDishes.filter((dish) => {
      const matchesCategory = categoryFilter === '全部' || dish.category === categoryFilter;
      const matchesKeyword =
        !keyword ||
        dish.name.toLowerCase().includes(keyword) ||
        dish.category.toLowerCase().includes(keyword) ||
        dish.description.toLowerCase().includes(keyword);

      return matchesCategory && matchesKeyword;
    });
  }, [categoryFilter, query, sortedDishes]);

  const selectedDish = draftDishes.find((dish) => dish.id === selectedId) || draftDishes[0];
  const availableCount = draftDishes.filter((dish) => dish.isAvailable).length;
  const orderTotalQuantity = orders.reduce((sum, order) => sum + (Number(order.totalQuantity) || 0), 0);
  const orderTotalAmount = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

  useEffect(() => {
    function refreshOrders() {
      loadOrders({ quiet: true });
    }

    function handleStorage(event) {
      if (event.key === ORDER_STORAGE_KEY) {
        refreshOrders();
      }
    }

    window.addEventListener(ORDER_CHANGE_EVENT, refreshOrders);
    window.addEventListener('storage', handleStorage);
    const timer = window.setInterval(refreshOrders, 3000);

    return () => {
      window.removeEventListener(ORDER_CHANGE_EVENT, refreshOrders);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    loadFeishuStatus();
  }, []);

  function replaceDishes(nextDishes, nextSelectedId = selectedId) {
    setDraftDishes(nextDishes);
    if (!nextDishes.some((dish) => dish.id === nextSelectedId)) {
      setSelectedId(nextDishes[0]?.id || '');
      return;
    }
    setSelectedId(nextSelectedId);
  }

  function updateDish(id, field, value) {
    setMessage('');
    setDraftDishes((current) =>
      current.map((dish) => (dish.id === id ? { ...dish, [field]: value } : dish)),
    );
  }

  function handleAddDish() {
    const newDish = createBlankDish(draftDishes);
    replaceDishes([...draftDishes, newDish], newDish.id);
    setActivePanel('dishes');
    setMessage('已新增菜品，记得保存后才会应用到点餐页。');
  }

  function handleDeleteDish(id) {
    const dish = draftDishes.find((item) => item.id === id);
    if (!dish || !window.confirm(`确定删除“${dish.name}”吗？`)) {
      return;
    }

    replaceDishes(draftDishes.filter((item) => item.id !== id));
    setMessage('菜品已从草稿中删除，点击保存后生效。');
  }

  async function handleImageUpload(id, file) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('请选择图片文件。');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateDish(id, 'image', dataUrl);
      setMessage('图片已上传到当前浏览器草稿，点击保存后生效。');
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleSave() {
    const nextDishes = draftDishes.map(normalizeDish);
    const ids = nextDishes.map((dish) => dish.id);
    const hasDuplicateId = ids.some((id, index) => ids.indexOf(id) !== index);

    if (hasDuplicateId) {
      setMessage('保存失败：菜品 ID 不能重复。');
      return;
    }

    saveDishesToStorage(nextDishes);
    replaceDishes(nextDishes);
    onDishesChange(nextDishes);
    setMessage('已保存，点餐页面会使用最新菜品、价格和图片。');
  }

  function handleReset() {
    if (!window.confirm('确定恢复默认菜品吗？当前浏览器里的后台编辑会被清除。')) {
      return;
    }

    const nextDishes = defaultDishes.map(normalizeDish);
    clearStoredDishes();
    replaceDishes(nextDishes, nextDishes[0]?.id || '');
    onDishesChange(nextDishes);
    setMessage('已恢复为 dishes.json 默认菜品。');
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(draftDishes.map(normalizeDish), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'party-menu-dishes.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('已导出当前菜品 JSON。');
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const importedDishes = JSON.parse(text);

      if (!Array.isArray(importedDishes)) {
        throw new Error('JSON 必须是菜品数组。');
      }

      const nextDishes = importedDishes.map(normalizeDish);
      replaceDishes(nextDishes, nextDishes[0]?.id || '');
      setMessage('已导入菜品草稿，确认无误后点击保存。');
    } catch (error) {
      setMessage(`导入失败：${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

  async function loadOrders({ quiet = false, showMessage = false } = {}) {
    if (!quiet) {
      setOrdersLoading(true);
    }

    try {
      const response = await fetch(orderApiEndpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true || !Array.isArray(payload.orders)) {
        throw new Error(payload.message || `订单后端返回 ${response.status}`);
      }

      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      setOrderSource('backend');
      if (showMessage) {
        setMessage('订单列表已从后端刷新。');
      }
    } catch (error) {
      console.error('读取订单后端失败:', error);
      setOrders(readStoredOrders());
      setOrderSource('local');
      if (showMessage) {
        setMessage(`订单后端暂不可用，已显示当前浏览器本地订单：${error.message}`);
      }
    } finally {
      if (!quiet) {
        setOrdersLoading(false);
      }
    }
  }

  function handleRefreshOrders() {
    loadOrders({ showMessage: true });
  }

  async function handleClearOrders() {
    if (!window.confirm('确定清空订单吗？')) {
      return;
    }

    try {
      const response = await fetch(orderApiEndpoint, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || `订单后端返回 ${response.status}`);
      }

      clearStoredOrders();
      setOrders([]);
      setOrderSource('backend');
      setMessage('后端订单已清空。');
    } catch (error) {
      console.error('清空订单后端失败:', error);
      clearStoredOrders();
      setOrders([]);
      setOrderSource('local');
      setMessage(`订单后端暂不可用，已清空当前浏览器本地订单：${error.message}`);
    }
  }

  async function loadFeishuStatus() {
    try {
      const response = await fetch(feishuApiEndpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || `飞书接口返回 ${response.status}`);
      }

      setFeishuStatus({
        adminTokenRequired: Boolean(payload.adminTokenRequired),
        configured: Boolean(payload.configured),
        envConfigured: Boolean(payload.envConfigured),
        kvConfigured: Boolean(payload.kvConfigured),
        signed: Boolean(payload.signed),
        storedConfigured: Boolean(payload.storedConfigured),
      });
    } catch (error) {
      console.error('读取飞书配置失败:', error);
      setMessage(`读取飞书配置失败：${error.message}`);
    }
  }

  async function handleSaveFeishuConfig(event) {
    event.preventDefault();
    setFeishuLoading(true);

    try {
      const response = await fetch(feishuApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feishuForm),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || `飞书接口返回 ${response.status}`);
      }

      setMessage(payload.message || '飞书已连接。');
      setFeishuForm((current) => ({ ...current, secret: '', webhookUrl: '' }));
      await loadFeishuStatus();
    } catch (error) {
      console.error('保存飞书配置失败:', error);
      setMessage(`保存飞书配置失败：${error.message}`);
    } finally {
      setFeishuLoading(false);
    }
  }

  async function handleClearFeishuConfig() {
    if (!window.confirm('确定清除后台保存的飞书配置吗？')) {
      return;
    }

    setFeishuLoading(true);

    try {
      const response = await fetch(feishuApiEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: feishuForm.adminToken }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || `飞书接口返回 ${response.status}`);
      }

      setMessage(payload.message || '已清除飞书配置。');
      await loadFeishuStatus();
    } catch (error) {
      console.error('清除飞书配置失败:', error);
      setMessage(`清除飞书配置失败：${error.message}`);
    } finally {
      setFeishuLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-rice text-ink">
      <section className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        <header className="rounded-lg bg-white p-4 shadow-lift">
          <a
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
            href="#/"
          >
            <ArrowLeft size={17} />
            返回点餐
          </a>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-500">管理员后台</p>
              <h1 className="mt-1 text-2xl font-bold">
                {activePanel === 'dishes'
                  ? '菜品管理'
                  : activePanel === 'orders'
                    ? '订单查询'
                    : '飞书设置'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {activePanel === 'dishes'
                  ? '管理菜品名称、分类、价格、图片、描述和上下架状态。'
                  : activePanel === 'orders'
                    ? '查看后端集中订单，客户下单后会自动进入这里。'
                    : '保存飞书机器人 Webhook，并发送测试消息。'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {activePanel === 'dishes' ? (
                <>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    onClick={handleAddDish}
                    type="button"
                  >
                    <Plus size={16} />
                    新增
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    onClick={handleExport}
                    type="button"
                  >
                    <Download size={16} />
                    导出
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={16} />
                    导入
                  </button>
                  <input
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImport}
                    ref={importInputRef}
                    type="file"
                  />
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    onClick={handleReset}
                    type="button"
                  >
                    <RotateCcw size={16} />
                    恢复默认
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-bold text-white"
                    onClick={handleSave}
                    type="button"
                  >
                    <Save size={16} />
                    保存
                  </button>
                </>
              ) : activePanel === 'orders' ? (
                <>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    disabled={ordersLoading}
                    onClick={handleRefreshOrders}
                    type="button"
                  >
                    <RefreshCw className={ordersLoading ? 'animate-spin' : ''} size={16} />
                    {ordersLoading ? '刷新中' : '刷新'}
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={orders.length === 0}
                    onClick={handleClearOrders}
                    type="button"
                  >
                    <Trash2 size={16} />
                    清空订单
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
                    disabled={feishuLoading}
                    onClick={loadFeishuStatus}
                    type="button"
                  >
                    <RefreshCw className={feishuLoading ? 'animate-spin' : ''} size={16} />
                    刷新状态
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={feishuLoading || !feishuStatus.storedConfigured}
                    onClick={handleClearFeishuConfig}
                    type="button"
                  >
                    <Trash2 size={16} />
                    清除配置
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-full bg-rice p-1">
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-black ${
                activePanel === 'dishes' ? 'bg-leaf text-white shadow-sm' : 'text-stone-600'
              }`}
              onClick={() => setActivePanel('dishes')}
              type="button"
            >
              <Utensils size={16} />
              菜品管理
            </button>
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-black ${
                activePanel === 'orders' ? 'bg-leaf text-white shadow-sm' : 'text-stone-600'
              }`}
              onClick={() => setActivePanel('orders')}
              type="button"
            >
              <ClipboardList size={16} />
              订单查询
            </button>
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-black ${
                activePanel === 'feishu' ? 'bg-leaf text-white shadow-sm' : 'text-stone-600'
              }`}
              onClick={() => setActivePanel('feishu')}
              type="button"
            >
              <Bot size={16} />
              飞书设置
            </button>
          </div>

          {activePanel === 'dishes' ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">菜品</p>
                <p className="mt-1 text-xl font-black">{draftDishes.length}</p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">上架</p>
                <p className="mt-1 text-xl font-black text-leaf">{availableCount}</p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">分类</p>
                <p className="mt-1 text-xl font-black text-tomato">
                  {Math.max(categories.length - 1, 0)}
                </p>
              </div>
            </div>
          ) : activePanel === 'orders' ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">订单</p>
                <p className="mt-1 text-xl font-black">{orders.length}</p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">菜品数量</p>
                <p className="mt-1 text-xl font-black text-leaf">{orderTotalQuantity}</p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">金额</p>
                <p className="mt-1 text-xl font-black text-tomato">¥{orderTotalAmount}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">飞书</p>
                <p className="mt-1 text-xl font-black text-leaf">
                  {feishuStatus.configured ? '已连' : '未连'}
                </p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">来源</p>
                <p className="mt-1 text-xl font-black text-ink">
                  {feishuStatus.envConfigured ? '环境' : feishuStatus.storedConfigured ? '后台' : '-'}
                </p>
              </div>
              <div className="rounded-lg bg-rice p-3">
                <p className="text-xs font-bold text-stone-500">签名</p>
                <p className="mt-1 text-xl font-black text-tomato">
                  {feishuStatus.signed ? '开启' : '未开'}
                </p>
              </div>
            </div>
          )}

          {message ? (
            <p className="mt-3 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
              {message}
            </p>
          ) : null}
        </header>

        {activePanel === 'dishes' ? (
          <section className="grid gap-4 lg:grid-cols-[280px_1fr]" aria-label="菜品管理工作台">
            <aside className="rounded-lg bg-white p-3 shadow-sm">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  size={16}
                />
                <input
                  className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索菜品"
                  value={query}
                />
              </div>

              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-base font-semibold outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="mt-3 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                {visibleDishes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-stone-300 bg-rice p-4 text-center text-sm font-semibold text-stone-600">
                    没有找到菜品
                  </div>
                ) : (
                  visibleDishes.map((dish) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition active:scale-[0.99] ${
                        selectedDish?.id === dish.id
                          ? 'border-leaf bg-leaf/10'
                          : 'border-stone-200 bg-white'
                      }`}
                      key={dish.id}
                      onClick={() => setSelectedId(dish.id)}
                      type="button"
                    >
                      <img
                        alt={dish.name}
                        className="h-14 w-14 shrink-0 rounded-lg bg-stone-100 object-cover"
                        src={dish.image}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{dish.name}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-stone-500">
                          {dish.category} · ¥{Number(dish.price) || 0}
                        </span>
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          dish.isAvailable ? 'bg-leaf' : 'bg-stone-300'
                        }`}
                      />
                    </button>
                  ))
                )}
              </div>
            </aside>

            {selectedDish ? (
              <article className="rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-500">正在编辑</p>
                    <h2 className="mt-1 truncate text-2xl font-black">{selectedDish.name}</h2>
                    <p className="mt-1 break-all text-xs font-semibold text-stone-500">
                      ID：{selectedDish.id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink">
                      <input
                        checked={selectedDish.isAvailable}
                        className="h-4 w-4 accent-leaf"
                        onChange={(event) =>
                          updateDish(selectedDish.id, 'isAvailable', event.target.checked)
                        }
                        type="checkbox"
                      />
                      上架
                    </label>
                    <button
                      aria-label={`删除 ${selectedDish.name}`}
                      className="grid h-10 w-10 place-items-center rounded-full bg-tomato/10 text-tomato"
                      onClick={() => handleDeleteDish(selectedDish.id)}
                      type="button"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      <img
                        alt={selectedDish.name}
                        className="aspect-[4/3] w-full object-cover"
                        src={selectedDish.image}
                      />
                    </div>
                    <label className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-leaf px-4 text-sm font-bold text-white">
                      <ImagePlus size={17} />
                      上传图片
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageUpload(selectedDish.id, event.target.files?.[0])}
                        type="file"
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      图片会保存到当前浏览器。图片过大会占用较多 localStorage 空间。
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                      菜名
                      <input
                        className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        onChange={(event) => updateDish(selectedDish.id, 'name', event.target.value)}
                        value={selectedDish.name}
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                      分类
                      <input
                        className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        onChange={(event) =>
                          updateDish(selectedDish.id, 'category', event.target.value)
                        }
                        value={selectedDish.category}
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                      价格
                      <input
                        className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        min="0"
                        onChange={(event) => updateDish(selectedDish.id, 'price', event.target.value)}
                        step="0.1"
                        type="number"
                        value={selectedDish.price}
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                      排序
                      <input
                        className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        onChange={(event) =>
                          updateDish(selectedDish.id, 'sortOrder', event.target.value)
                        }
                        type="number"
                        value={selectedDish.sortOrder}
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700 sm:col-span-2">
                      图片 URL
                      <input
                        className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        onChange={(event) => updateDish(selectedDish.id, 'image', event.target.value)}
                        value={selectedDish.image}
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-stone-700 sm:col-span-2">
                      描述
                      <textarea
                        className="min-h-[120px] resize-none rounded-lg border border-stone-200 px-3 py-2 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                        onChange={(event) =>
                          updateDish(selectedDish.id, 'description', event.target.value)
                        }
                        value={selectedDish.description}
                      />
                    </label>
                  </div>
                </div>
              </article>
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm font-semibold text-stone-600">
                还没有菜品，点击“新增”开始创建。
              </div>
            )}
          </section>
        ) : activePanel === 'orders' ? (
          <section className="space-y-3" aria-label="订单查询列表">
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-stone-700">订单来源说明</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {orderSource === 'backend'
                  ? '当前页面读取后端集中订单，客户下单后会自动进入这里。'
                  : '订单后端暂不可用，当前显示的是这个浏览器里的本地订单。'}
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm font-semibold text-stone-600">
                暂无订单。提交一笔测试订单后，这里会自动刷新。
              </div>
            ) : (
              orders.map((order, index) => (
                <article className="rounded-lg bg-white p-4 shadow-sm" key={`${order.createdAt}-${index}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-500">下单人</p>
                      <h2 className="mt-1 text-xl font-black">{order.customerName || '未填写姓名'}</h2>
                      <p className="mt-1 text-sm text-stone-500">{formatTime(order.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <span className="rounded-full bg-rice px-3 py-1 text-sm font-bold text-leaf">
                        {order.totalQuantity || 0} 份
                      </span>
                      <span className="rounded-full bg-tomato/10 px-3 py-1 text-sm font-bold text-tomato">
                        {formatAmount(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {(order.items || []).map((item) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg bg-rice px-3 py-2"
                        key={`${item.dishId}-${item.name}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">{item.name}</p>
                          <p className="text-sm text-stone-600">
                            {item.category}
                            {typeof item.price === 'number' ? ` · 单价 ¥${item.price}` : ''}
                          </p>
                        </div>
                        <strong className="shrink-0 text-sm">
                          x {item.quantity}
                          {typeof item.subtotal === 'number' ? ` · ¥${item.subtotal}` : ''}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-600">
                    备注：{order.remark || '无'}
                  </p>
                </article>
              ))
            )}
          </section>
        ) : (
          <section className="space-y-4" aria-label="飞书设置">
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-stone-700">飞书连接状态</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {feishuStatus.configured
                      ? '飞书机器人已经配置，客户下单后会尝试推送到飞书群。'
                      : '还没有配置飞书机器人。填写 Webhook 后点击保存并测试。'}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-sm font-black ${
                    feishuStatus.configured
                      ? 'bg-leaf/10 text-leaf'
                      : 'bg-tomato/10 text-tomato'
                  }`}
                >
                  {feishuStatus.configured ? '已连接' : '未连接'}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-rice p-3">
                  <p className="text-xs font-bold text-stone-500">KV 存储</p>
                  <p className="mt-1 text-lg font-black">{feishuStatus.kvConfigured ? '已配置' : '未配置'}</p>
                </div>
                <div className="rounded-lg bg-rice p-3">
                  <p className="text-xs font-bold text-stone-500">后台配置</p>
                  <p className="mt-1 text-lg font-black">{feishuStatus.storedConfigured ? '已保存' : '未保存'}</p>
                </div>
                <div className="rounded-lg bg-rice p-3">
                  <p className="text-xs font-bold text-stone-500">环境变量</p>
                  <p className="mt-1 text-lg font-black">{feishuStatus.envConfigured ? '已配置' : '未配置'}</p>
                </div>
              </div>
            </div>

            <form className="rounded-lg bg-white p-4 shadow-sm" onSubmit={handleSaveFeishuConfig}>
              <div className="mb-4">
                <p className="text-sm font-bold text-stone-700">一键连接飞书</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  配置会保存到后端 KV，不会暴露给点餐前台。保存成功后会自动发送一条飞书测试消息。
                </p>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                  管理员部署口令
                  <input
                    className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    onChange={(event) =>
                      setFeishuForm((current) => ({ ...current, adminToken: event.target.value }))
                    }
                    placeholder="Vercel 环境变量 ADMIN_SETUP_TOKEN"
                    type="password"
                    value={feishuForm.adminToken}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                  飞书机器人 Webhook
                  <input
                    className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    onChange={(event) =>
                      setFeishuForm((current) => ({ ...current, webhookUrl: event.target.value }))
                    }
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    value={feishuForm.webhookUrl}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                  签名 Secret
                  <input
                    className="h-11 rounded-lg border border-stone-200 px-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    onChange={(event) =>
                      setFeishuForm((current) => ({ ...current, secret: event.target.value }))
                    }
                    placeholder="飞书机器人开启签名校验时填写"
                    type="password"
                    value={feishuForm.secret}
                  />
                </label>
              </div>

              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-tomato px-5 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={feishuLoading}
                type="submit"
              >
                <Send size={17} />
                {feishuLoading ? '连接中...' : '保存并发送测试消息'}
              </button>
            </form>

            <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600 shadow-sm">
              使用前需要在 Vercel 先配置 `KV_REST_API_URL`、`KV_REST_API_TOKEN` 和
              `ADMIN_SETUP_TOKEN`。如果已经通过 Vercel 环境变量配置了 `FEISHU_WEBHOOK_URL`，
              后台保存的配置不会覆盖环境变量。
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
