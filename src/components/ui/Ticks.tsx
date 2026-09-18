import { cn } from "@/lib/utils";

/**
 * Every rule in AYO counts whole customers, never percentages: 5 to stay Warm,
 * 8 to earn the guarantee, 12 to hit the month's target. So progress is drawn as
 * discrete cells you can count, with a marker where the rule actually bites.
 */
export function Ticks({
  value,
  target,
  threshold,
  tone = "ink",
  size = "md",
}: {
  value: number;
  target: number;
  threshold?: number;
  tone?: "ink" | "accent" | "good" | "warn";
  size?: "md" | "sm";
}) {
  const cells = Math.max(target, 1);
  const fills = {
    ink: "bg-ink",
    accent: "bg-accent",
    good: "bg-good",
    warn: "bg-warn",
  } as const;

  return (
    <div className="flex items-end gap-[3px]" aria-label={`${value} dari ${target}`}>
      {Array.from({ length: cells }, (_, i) => {
        const filled = i < value;
        const isThresholdEdge = threshold !== undefined && i + 1 === threshold;
        return (
          <span
            key={i}
            style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
            className={cn(
              "flex-1 origin-bottom rounded-[2px] animate-tick",
              size === "sm" ? "h-3" : "h-6",
              filled ? fills[tone] : "bg-line",
              isThresholdEdge && "mr-[5px] shadow-[3px_0_0_-1px_#10312B]",
            )}
          />
        );
      })}
    </div>
  );
}

export function TickCaption({
  value,
  target,
  suffix,
}: {
  value: number;
  target: number;
  suffix?: string;
}) {
  return (
    <div className="mt-2 flex items-baseline justify-between text-[13px]">
      <span className="num font-semibold">
        {value}
        <span className="text-ink-faint">/{target}</span>
      </span>
      {suffix && <span className="text-ink-mute">{suffix}</span>}
    </div>
  );
}
