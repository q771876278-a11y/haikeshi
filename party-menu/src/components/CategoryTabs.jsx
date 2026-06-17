export default function CategoryTabs({ categories, activeCategory, onChange }) {
  return (
    <nav
      className="no-scrollbar sticky top-0 z-10 -mx-3 flex gap-2 overflow-x-auto bg-rice/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4"
      aria-label="菜品分类"
    >
      {categories.map((category) => (
        <button
          key={category}
          className={`h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
            activeCategory === category
              ? 'border-leaf bg-leaf text-white shadow-sm'
              : 'border-stone-200 bg-white text-stone-700 shadow-sm'
          }`}
          onClick={() => onChange(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </nav>
  );
}
