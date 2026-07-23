/**
 * Client-side IP geolocation helper. The browser fetches the user's OWN IP info
 * (a Convex action's outbound IP would be Convex's infrastructure, not the
 * user's) and passes a city/region hint to the backend. The backend's
 * `regions.ensureRegion` then find-or-creates the matching region.
 *
 * Uses ipapi.co's keyless JSON endpoint. Failures (ad blockers, offline, API
 * down, non-ID IP, rate limit) return null — callers must treat that as "use
 * the default region" and never block registration on it.
 */

export type GeoHint = string | null;

/**
 * Look up the user's approximate city/region from their IP. Returns a trimmed
 * human-readable string (e.g. "Jakarta") or null on any failure.
 *
 * `signal` lets callers abort an in-flight lookup (e.g. on unmount).
 */
export async function lookupGeoHint(
  signal?: AbortSignal,
): Promise<GeoHint> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal,
      // Never cache — we want the current IP's location.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
    };
    // Prefer city (most specific), fall back to region, then nothing (the
    // backend will use the default region). Do NOT fall back to country —
    // "Indonesia" would create a useless single country-region.
    const hint = (data.city || data.region || "").trim();
    return hint || null;
  } catch {
    return null;
  }
}
