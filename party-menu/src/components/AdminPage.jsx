import {
  ArrowLeft,
  Download,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { clearStoredDishes, saveDishesToStorage } from '../utils/storage';

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

export default function AdminPage({ defaultDishes, dishes, onDishesChange }) {
  const [draftDishes, setDraftDishes] = useState(dishes.map(normalizeDish));
  const [selectedId, setSelectedId] = useState(dishes[0]?.id || '');
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
              <h1 className="mt-1 text-2xl font-bold">菜品管理</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                管理菜品名称、分类、价格、图片、描述和上下架状态。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

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
              <p className="mt-1 text-xl font-black text-tomato">{Math.max(categories.length - 1, 0)}</p>
            </div>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
              {message}
            </p>
          ) : null}
        </header>

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
                      onChange={(event) => updateDish(selectedDish.id, 'category', event.target.value)}
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
                      onChange={(event) => updateDish(selectedDish.id, 'sortOrder', event.target.value)}
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
                      onChange={(event) => updateDish(selectedDish.id, 'description', event.target.value)}
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
      </section>
    </main>
  );
}
