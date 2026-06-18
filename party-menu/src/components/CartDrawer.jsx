import { Minus, Plus, Trash2, X } from 'lucide-react';

function RoundButton({ ariaLabel, children, disabled = false, onClick }) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function CartDrawer({
  cartItems,
  onClose,
  onDecrease,
  onDelete,
  onIncrease,
  open,
  totalAmount,
  totalQuantity,
}) {
  return (
    <div
      className={`fixed inset-0 z-30 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        aria-label="关闭购物车遮罩"
        className={`absolute inset-0 bg-ink/45 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        type="button"
      />

      <section
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[82vh] max-w-[480px] rounded-t-lg bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-drawer transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-500">购物车</p>
              <h2 className="text-[1.45rem] font-bold">{totalQuantity} 份菜品</h2>
              <p className="mt-1 text-sm font-bold text-tomato">合计 ¥{totalAmount}</p>
            </div>
            <button
              aria-label="关闭购物车"
              className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white"
              onClick={onClose}
              type="button"
            >
              <X size={19} />
            </button>
          </div>

          <div className="min-h-[170px] space-y-3 overflow-y-auto pb-2">
            {cartItems.length === 0 ? (
              <div className="grid min-h-[170px] place-items-center rounded-lg border border-dashed border-stone-300 bg-rice p-5 text-center text-sm font-semibold leading-6 text-stone-600">
                还没有选择菜品，先去菜单里挑几道喜欢的吧。
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg bg-rice p-3 shadow-sm"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      ¥{Number(item.price) || 0} x {item.quantity} 份
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <RoundButton
                      ariaLabel={`减少 ${item.name}`}
                      disabled={item.quantity === 0}
                      onClick={() => onDecrease(item.id)}
                    >
                      <Minus size={16} />
                    </RoundButton>
                    <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <RoundButton ariaLabel={`增加 ${item.name}`} onClick={() => onIncrease(item.id)}>
                      <Plus size={16} />
                    </RoundButton>
                    <button
                      aria-label={`删除 ${item.name}`}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-tomato shadow-sm transition active:scale-95"
                      onClick={() => onDelete(item.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
