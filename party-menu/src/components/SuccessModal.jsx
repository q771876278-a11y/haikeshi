import { CheckCircle2, X } from 'lucide-react';

export default function SuccessModal({ message, onClose, open, tip }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/45 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center shadow-lift">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leaf/10 text-leaf">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-3 text-xl font-bold">提交成功</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{message}</p>
        {tip ? (
          <p className="mt-3 rounded-lg bg-rice px-3 py-2 text-sm font-bold text-leaf">{tip}</p>
        ) : null}
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white"
          onClick={onClose}
          type="button"
        >
          <X size={17} />
          关闭
        </button>
      </div>
    </div>
  );
}
