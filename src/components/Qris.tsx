import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The QRIS payload is rendered client-side so the image never has to travel and
// never gets cached anywhere it could be mistaken for a different amount.

export function QrisCode({
  payload,
  size = 232,
  className,
  style,
}: {
  payload: string;
  /** Render resolution in px. `className` may scale the element down. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
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
        className={cn(
          "grid aspect-square place-items-center rounded border border-dashed border-line-strong text-[13px] text-ink-faint",
          className,
        )}
        style={style ?? (className ? undefined : { width: size, height: size })}
      >
        QR gagal dibuat
      </div>
    );
  }
  return (
    <canvas
      ref={canvas}
      aria-label="Kode QRIS pembayaran"
      className={cn("rounded bg-white", className)}
      style={style ?? (className ? undefined : { width: size, height: size })}
    />
  );
}

/**
 * The QR dressed as the printed stand merchants already recognise: QRIS and GPN
 * marks, the red corners, and the merchant identity above the code.
 *
 * A buyer who has scanned a hundred of these in warungs trusts the frame before
 * they read a word of it, which is the entire point — a bare QR on a phone
 * screen asking for a transfer looks like a scam.
 *
 * Only what is printed on a real stand goes inside: merchant name, NMID, code.
 * The amount is per-transaction, so it belongs to the page around the frame,
 * where it can be as loud as it needs to be.
 *
 * The frame art is the official template (610 x 744); everything inside is
 * positioned as a percentage of it, so one component serves both the agent's
 * phone and the buyer's payment link.
 */
export function QrisFrame({
  payload,
  merchantName,
  nmid,
  className,
}: {
  payload: string;
  merchantName?: string | null;
  nmid?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn("relative w-full max-w-[320px] select-none", className)}
      style={{ aspectRatio: "610 / 744", containerType: "inline-size" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static frame art, already optimal as SVG */}
      <img
        src="/img/qris-frame.svg"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full rounded-[3.4cqw] shadow-lift"
      />

      {/* The white card the QR sits on, clear of both red corners. */}
      <div
        className="absolute flex flex-col items-center rounded-[2cqw] bg-white"
        style={{
          left: "8%",
          right: "8%",
          top: "17%",
          bottom: "6%",
          padding: "4cqw",
          boxShadow: "0 0.5cqw 3cqw rgba(16,17,18,0.10)",
        }}
      >
        {merchantName && (
          <p
            className="w-full text-center font-semibold uppercase leading-tight text-[#101112]"
            style={{ fontSize: "4.4cqw", letterSpacing: "0.02em" }}
          >
            {merchantName}
          </p>
        )}
        {nmid && (
          <p
            className="num w-full text-center text-[#6B7076]"
            style={{ fontSize: "3cqw", marginTop: "0.8cqw" }}
          >
            NMID {nmid}
          </p>
        )}

        {/* Takes whatever height is left, never more — the frame must not spill. */}
        <QrisCode
          key={payload}
          payload={payload}
          size={720}
          className="mt-[2cqw] min-h-0 w-auto flex-1 rounded-none"
          style={{ maxWidth: "100%", maxHeight: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}
