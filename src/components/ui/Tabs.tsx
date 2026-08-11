import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div
      role="tablist"
      className="mb-4 flex gap-1 overflow-x-auto rounded border border-line bg-surface p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded px-3 py-2 text-[14px] font-semibold transition-colors",
              active ? "bg-ink text-white" : "text-ink-mute hover:bg-black/[0.03]",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("num ml-1.5", active ? "text-white/60" : "text-ink-faint")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
