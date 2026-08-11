import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  return <As className={cn("card", className)}>{children}</As>;
}

/** Section heading. No subtitle by default — §33: helper text only when needed. */
export function SectionTitle({
  children,
  action,
  helper,
}: {
  children: ReactNode;
  action?: ReactNode;
  helper?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{children}</h2>
        {helper && <p className="mt-1 max-w-prose text-[13px] text-ink-mute">{helper}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * The money row: label on the left, amount hard against the right edge in mono.
 * Every list in AYO uses it, so amounts line up down the whole page.
 */
export function Row({
  label,
  sub,
  value,
  valueSub,
  tone = "default",
  onClick,
  href,
}: {
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  tone?: "default" | "good" | "warn" | "mute";
  onClick?: () => void;
  href?: string;
}) {
  const tones = {
    default: "text-ink",
    good: "text-good",
    warn: "text-warn",
    mute: "text-ink-mute",
  } as const;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{label}</div>
        {sub && <div className="mt-0.5 truncate text-[13px] text-ink-mute">{sub}</div>}
      </div>
      {(value !== undefined || valueSub !== undefined) && (
        <div className="shrink-0 text-right">
          <div className={cn("num text-[15px] font-semibold", tones[tone])}>{value}</div>
          {valueSub && <div className="mt-0.5 text-[13px] text-ink-mute">{valueSub}</div>}
        </div>
      )}
    </>
  );

  const base =
    "flex w-full items-center gap-4 px-4 py-3 text-left border-b border-line last:border-0";

  if (href) {
    return (
      <a href={href} className={cn(base, "press hover:bg-black/[0.02]")}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, "press hover:bg-black/[0.02]")}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}

/** Two-line figure. Label above, number below — never the other way round. */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "warn";
}) {
  const tones = { default: "text-ink", good: "text-good", warn: "text-warn" } as const;
  return (
    <div className="px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className={cn("num mt-1 text-[22px] font-semibold leading-none", tones[tone])}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[13px] text-ink-mute">{sub}</div>}
    </div>
  );
}
