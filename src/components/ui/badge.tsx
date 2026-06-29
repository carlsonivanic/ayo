import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "slate" | "blue";

const TONE: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
      {...props}
    />
  );
}
