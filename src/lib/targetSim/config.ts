/**
 * localStorage-backed SimConfig store.
 *
 * One key (`ayo:simConfig`) holds the editable business constants. The
 * /simulator/settings page writes here; the infographic reads here so edits
 * flow live. Defaults mirror convex/seed.ts via DEFAULT_SIM_CONFIG.
 *
 * This is a client-only store (the simulator is a public, no-login tool). On
 * the server (SSG) we fall back to defaults — no localStorage access.
 */
import { useEffect, useState, useCallback } from "react";
import { DEFAULT_SIM_CONFIG } from "./defaults";
import type { SimConfig } from "./types";

const KEY = "ayo:simConfig";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read the stored config, falling back to defaults (server + first paint). */
export function loadConfig(): SimConfig {
  if (!isBrowser()) return DEFAULT_SIM_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SIM_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SimConfig>;
    // Merge defensively so a missing field (after a schema bump) still resolves.
    return {
      prices: { ...DEFAULT_SIM_CONFIG.prices, ...parsed.prices },
      l1Rates: { ...DEFAULT_SIM_CONFIG.l1Rates, ...parsed.l1Rates },
      decay: { ...DEFAULT_SIM_CONFIG.decay, ...parsed.decay },
      churnDefault: parsed.churnDefault ?? DEFAULT_SIM_CONFIG.churnDefault,
      agentChurnDefault: parsed.agentChurnDefault ?? DEFAULT_SIM_CONFIG.agentChurnDefault,
      growthDefault: { ...DEFAULT_SIM_CONFIG.growthDefault, ...parsed.growthDefault },
    };
  } catch {
    return DEFAULT_SIM_CONFIG;
  }
}

/** Persist a config. No-op on the server. */
export function saveConfig(config: SimConfig): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(config));
  // Notify same-tab listeners (the storage event only fires cross-tab).
  window.dispatchEvent(new CustomEvent("ayo:simConfigChanged"));
}

/** Reset to seed defaults. */
export function resetConfig(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("ayo:simConfigChanged"));
}

/**
 * React hook: returns the current config and stays in sync across edits (same
 * tab via the custom event, other tabs via the storage event). SSR-safe —
 * renders defaults first, then hydrates to the stored value.
 */
export function useSimConfig(): {
  config: SimConfig;
  save: (c: SimConfig) => void;
  reset: () => void;
} {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_SIM_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
    const onChange = () => setConfig(loadConfig());
    window.addEventListener("ayo:simConfigChanged", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ayo:simConfigChanged", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback((c: SimConfig) => {
    saveConfig(c);
    setConfig(c);
  }, []);

  const reset = useCallback(() => {
    resetConfig();
    setConfig(DEFAULT_SIM_CONFIG);
  }, []);

  return { config, save, reset };
}
