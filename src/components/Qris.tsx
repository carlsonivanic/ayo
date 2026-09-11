import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

// The QRIS payload is rendered client-side so the image never has to travel and
// never gets cached anywhere it could be mistaken for a different amount.

export function QrisCode({ payload, size = 232 }: { payload: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    setFailed(false);
    QRCode.toCanvas(canvas.current, payload, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#101112", light: "#ffffff" },
    }).catch(() => setFailed(true));
  }, [payload, size]);

  if (failed) {
    return (
      <div
        className="grid place-items-center rounded border border-dashed border-line-strong text-[13px] text-ink-faint"
        style={{ width: size, height: size }}
      >
        QR gagal dibuat
      </div>
    );
  }
  return (
    <canvas
      ref={canvas}
      aria-label="Kode QRIS pembayaran"
      className="rounded bg-white"
      style={{ width: size, height: size }}
    />
  );
}
