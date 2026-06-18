import { Loader2, Send, X } from 'lucide-react';
import { useState } from 'react';

export default function OrderFormModal({
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
  open,
  totalAmount,
  totalQuantity,
}) {
  const [customerName, setCustomerName] = useState('');
  const [remark, setRemark] = useState('');

  if (!open) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      customerName,
      remark,
    });
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:place-items-center">
      <form
        className="w-full max-w-[480px] rounded-lg bg-white p-4 shadow-lift"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-500">提交订单</p>
            <h2 className="text-[1.45rem] font-bold">{totalQuantity} 份菜品</h2>
            <p className="mt-1 text-sm font-bold text-tomato">合计 ¥{totalAmount}</p>
          </div>
          <button
            aria-label="关闭提交表单"
            className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
            朋友姓名
            <input
              className="h-12 rounded-lg border border-stone-200 bg-white px-3 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              disabled={isSubmitting}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="例如：张三"
              value={customerName}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
            备注
            <textarea
              className="min-h-[92px] resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              disabled={isSubmitting}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="不要辣、少盐、多蒜"
              value={remark}
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-lg bg-tomato/10 px-3 py-2 text-sm font-semibold text-tomato">
            {errorMessage}
          </p>
        ) : null}

        {isSubmitting ? (
          <p className="mt-3 rounded-lg bg-rice px-3 py-2 text-sm font-semibold text-stone-600">
            正在提交订单，请稍候...
          </p>
        ) : null}

        <button
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-tomato px-5 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          {isSubmitting ? '提交中...' : '确认提交'}
        </button>
      </form>
    </div>
  );
}
