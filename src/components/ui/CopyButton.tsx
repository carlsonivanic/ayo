import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn, copy } from "@/lib/utils";

/** Inline copy chip: shows the value, copies `text` (defaults to the value). */
export function CopyButton({
  value,
  text,
  label,
  className,
}: {
  value: string;
  text?: string;
  label: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Salin ${label}`}
      onClick={async (e) => {
        e.stopPropagation();
        if (await copy(text ?? value)) {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }
      }}
      className={cn(
        "press num inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[13px] font-semibold hover:border-line-strong",
        done && "border-good text-good",
        className,
      )}
    >
      {value}
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-ink-mute" />}
    </button>
  );
}
