import { ArrowLeft, Copy, Download, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useMemo, useRef, useState } from 'react';

const QR_DISPLAY_SIZE = 320;
const QR_DOWNLOAD_SIZE = 1200;
const QR_DOWNLOAD_PADDING = 120;

export default function QrPage() {
  const canvasRef = useRef(null);
  const [copyMessage, setCopyMessage] = useState('');
  const orderUrl = useMemo(() => `${window.location.origin}/`, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopyMessage('点餐链接已复制');
    } catch {
      setCopyMessage('复制失败，请手动复制链接');
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = QR_DOWNLOAD_SIZE;
    exportCanvas.height = QR_DOWNLOAD_SIZE;
    const context = exportCanvas.getContext('2d');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, QR_DOWNLOAD_SIZE, QR_DOWNLOAD_SIZE);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      canvas,
      QR_DOWNLOAD_PADDING,
      QR_DOWNLOAD_PADDING,
      QR_DOWNLOAD_SIZE - QR_DOWNLOAD_PADDING * 2,
      QR_DOWNLOAD_SIZE - QR_DOWNLOAD_PADDING * 2,
    );

    const link = document.createElement('a');
    link.download = 'party-menu-qr.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  return (
    <main className="min-h-screen bg-rice text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-4 sm:px-6">
        <header className="rounded-lg bg-white p-4 shadow-lift">
          <a
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-ink"
            href="#/"
          >
            <ArrowLeft size={17} />
            返回点餐
          </a>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf text-white">
              <QrCode size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-stone-500">朋友扫码入口</p>
              <h1 className="mt-1 text-2xl font-bold">点餐二维码</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                把这个二维码发给朋友，大家扫码后会进入点餐首页。
              </p>
            </div>
          </div>
        </header>

        <section className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg bg-white p-5 text-center shadow-sm">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <QRCodeCanvas
              bgColor="#ffffff"
              fgColor="#000000"
              includeMargin
              level="H"
              ref={canvasRef}
              size={QR_DISPLAY_SIZE}
              value={orderUrl}
            />
          </div>

          <p className="mt-4 break-all rounded-lg bg-rice px-3 py-2 text-sm font-semibold text-stone-700">
            {orderUrl}
          </p>

          <div className="mt-5 grid w-full gap-3 sm:grid-cols-2">
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 text-sm font-bold text-ink transition active:scale-95"
              onClick={handleCopy}
              type="button"
            >
              <Copy size={17} />
              复制点餐链接
            </button>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-tomato px-5 text-sm font-bold text-white transition active:scale-95"
              onClick={handleDownload}
              type="button"
            >
              <Download size={17} />
              下载二维码
            </button>
          </div>

          {copyMessage ? (
            <p className="mt-3 text-sm font-semibold text-leaf">{copyMessage}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
