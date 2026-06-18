import { Minus, Plus } from 'lucide-react';

function CircleButton({ ariaLabel, children, disabled = false, onClick }) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-stone-100 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function DishCard({ dish, quantity, onAdd, onRemove }) {
  const price = Number(dish.price) || 0;

  return (
    <article className="grid grid-cols-[124px_1fr] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_10px_28px_rgba(24,33,29,0.08)]">
      <div className="relative h-[160px] overflow-hidden bg-stone-100">
        <img
          className="h-full w-full object-cover"
          src={dish.image}
          alt={dish.name}
          loading="lazy"
        />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[0.68rem] font-bold text-leaf shadow-sm backdrop-blur">
          {dish.category}
        </span>
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[1.02rem] font-bold leading-snug">{dish.name}</h2>
            <span className="shrink-0 text-base font-black text-tomato">¥{price}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">
            {dish.description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-rice p-1 shadow-inner">
            <CircleButton ariaLabel={`减少 ${dish.name}`} disabled={quantity === 0} onClick={onRemove}>
              <Minus size={16} />
            </CircleButton>
            <span className="min-w-7 text-center text-sm font-bold">{quantity}</span>
            <CircleButton ariaLabel={`增加 ${dish.name}`} onClick={onAdd}>
              <Plus size={16} />
            </CircleButton>
          </div>
        </div>
      </div>
    </article>
  );
}
