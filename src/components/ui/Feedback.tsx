import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-black/[0.05] text-ink-soft",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent-ink",
  ink: "bg-ink text-white",
} as const;

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** An empty screen is an invitation to act, not an apology. */
export function Empty({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[15px] text-ink-mute">{title}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-4">
          <div className="h-3 w-1/3 rounded bg-line" />
          <div className="h-3 w-16 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centred dialog from `sm` up. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-xl bg-surface shadow-lift animate-rise sm:max-w-md sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-1 rounded p-1 text-ink-mute hover:bg-black/[0.04]"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// --- toasts ---------------------------------------------------------------

type Toast = { id: number; message: string; tone: "ink" | "warn" };
const ToastContext = createContext<(message: string, tone?: "ink" | "warn") => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: "ink" | "warn" = "ink") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-rise rounded px-4 py-2.5 text-[14px] font-medium text-white shadow-lift",
              t.tone === "warn" ? "bg-warn" : "bg-ink",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
