/**
 * MixEditor — product mix edited by dragging the bar directly.
 *
 * The bar is split into 4 colored segments (one per tier). There are 3
 * DIVIDERS between adjacent segments; dragging a divider moves mass between
 * just those two segments (classic splitter behavior):
 *   drag divider right → left segment grows, right segment shrinks (and vice-versa)
 * The other two segments are untouched, so the total stays 100 by construction.
 *
 * This is direct manipulation of the bar — no separate sliders. The number
 * shown inside each segment is its current weight; the engine normalizes the
 * weights at use so they don't strictly have to sum to 100, but the dividers
 * keep them summing to 100 during editing.
 */
import { useRef, useCallback } from "react";
import type { Mix } from "@/lib/targetSim/types";

type Tier = keyof Mix;

const TIERS: { key: Tier; label: string; color: string }[] = [
  { key: "monthly", label: "Bulanan", color: "#10b981" },
  { key: "annual", label: "Tahunan", color: "#3b82f6" },
  { key: "lifetime_solo", label: "LT Solo", color: "#f59e0b" },
  { key: "lifetime_duo", label: "LT Duo", color: "#8b5cf6" },
];

export function MixEditor({
  mix,
  onChange,
}: {
  mix: Mix;
  onChange: (m: Mix) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const vals = TIERS.map((t) => mix[t.key]);
  const sum = vals.reduce((a, b) => a + b, 0) || 1;

  /** Pointer X → percentage (0..100) along the bar width. */
  const pctFromEvent = useCallback((clientX: number): number => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const p = (clientX - rect.left) / rect.width;
    return Math.min(100, Math.max(0, p * 100));
  }, []);

  /**
   * Drag divider `i` (between segment i and i+1) so the split point sits at
   * `targetPct` of the whole bar. Only segments i and i+1 change:
   *   newWidth(i)   = targetPct − leftEdge(i)
   *   newWidth(i+1) = (leftEdge(i+2)) − targetPct   [i.e. the pair total − newWidth(i)]
   * Both clamp to ≥ 0. Other segments are untouched. Total stays 100.
   */
  const moveDivider = useCallback(
    (i: number, targetPct: number) => {
      const leftEdgeI = vals.slice(0, i).reduce((a, b) => a + b, 0); // segments 0..i-1
      const pairTotal = vals[i] + vals[i + 1]; // mass shared between i and i+1
      const newLeft = Math.min(pairTotal, Math.max(0, Math.round(targetPct - leftEdgeI)));
      const next = [...vals];
      next[i] = newLeft;
      next[i + 1] = pairTotal - newLeft;
      const updated: Mix = { ...mix };
      TIERS.forEach((t, idx) => {
        updated[t.key] = Math.max(0, next[idx]);
      });
      onChange(updated);
    },
    [vals, mix, onChange],
  );

  const startDrag = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => moveDivider(i, pctFromEvent(ev.clientX));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Cumulative boundary positions for divider placement.
  const bounds: number[] = [0];
  vals.forEach((v, i) => (bounds[i + 1] = bounds[i] + v));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Bauran produk
        </span>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          total {sum}%
        </span>
      </div>

      {/* The stack bar — drag a divider between two segments to adjust them. */}
      <div
        ref={barRef}
        className="relative flex h-10 w-full touch-none overflow-hidden rounded-md"
      >
        {TIERS.map((t, i) => {
          const pct = (vals[i] / sum) * 100;
          return (
            <div
              key={t.key}
              className="flex items-center justify-center text-[10px] font-semibold text-white"
              style={{
                width: `${pct}%`,
                backgroundColor: t.color,
                minWidth: vals[i] > 0 ? "1.25rem" : 0,
              }}
              title={`${t.label}: ${vals[i]}%`}
            >
              {pct >= 12 ? `${vals[i]}%` : ""}
            </div>
          );
        })}
        {/* Dividers between adjacent segments (i = 0..2). Each moves mass
            between segment i and i+1 only. */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            onPointerDown={startDrag(i)}
            className="absolute top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center"
            style={{ left: `${(bounds[i + 1] / sum) * 100}%` }}
            role="separator"
            aria-label={`Batas ${TIERS[i].label} / ${TIERS[i + 1].label}`}
            aria-valuenow={vals[i]}
            aria-valuemin={0}
            aria-valuemax={vals[i] + vals[i + 1]}
          >
            <div className="flex h-8 w-1.5 items-center rounded-full bg-white shadow ring-1 ring-black/20">
              <div className="mx-auto h-4 w-0.5 bg-black/30" />
            </div>
          </div>
        ))}
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {TIERS.map((t, i) => (
          <div key={t.key} className="flex items-center gap-1 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.color }} />
            <span className="text-muted-foreground">{t.label}</span>
            <span className="font-semibold tabular-nums">{vals[i]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
