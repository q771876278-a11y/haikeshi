import { Loader2, Send, ShoppingBag } from 'lucide-react';

export default function CartBar({
  isSubmitting,
  onOpenCart,
  onOpenSubmit,
  status,
  totalAmount,
  totalQuantity,
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(24,33,29,0.12)]"
    >
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leaf text-white shadow-sm">
            <ShoppingBag size={21} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-500">已选择</p>
            <p className="truncate text-lg font-bold text-ink">{totalQuantity} 份菜品</p>
            <p className="text-xs font-bold text-tomato">合计 ¥{totalAmount}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex h-12 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-bold text-ink shadow-sm transition active:scale-95 min-[380px]:text-sm"
            onClick={onOpenCart}
            type="button"
          >
            查看购物车
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-tomato px-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(199,73,50,0.28)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none min-[380px]:gap-2 min-[380px]:px-4 min-[380px]:text-sm"
            disabled={totalQuantity === 0 || isSubmitting}
            onClick={onOpenSubmit}
            type="button"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
            {isSubmitting ? '提交中' : '去提交'}
          </button>
        </div>
      </div>
      {status.message ? (
        <p className={`mx-auto mt-2 max-w-[480px] text-xs font-semibold ${status.type === 'error' ? 'text-tomato' : 'text-stone-500'}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
