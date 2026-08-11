import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ink" | "quiet" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  // Yellow is reserved for the one thing you came here to do.
  primary: "bg-accent text-accent-ink hover:bg-[#e5ad04]",
  ink: "bg-ink text-white hover:bg-[#0b241f]",
  quiet: "bg-surface text-ink border border-line hover:border-line-strong",
  ghost: "text-ink-soft hover:bg-black/[0.04]",
  danger: "bg-warn text-white hover:bg-[#9c3c0d]",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  sm: "h-9 px-3 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    block?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", block, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded font-semibold",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
});
