/**
 * Tiny build identifier rendered at the bottom of auth screens, so you can tell
 * exactly which commit a deployed instance was built from. The value is baked
 * in at build time via next.config.mjs (`NEXT_PUBLIC_BUILD_ID`), set to the
 * short git SHA of the build. Renders nothing in dev when the env is unset.
 */
export function BuildIdStamp() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
  if (!buildId) return null;
  return (
    <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/70">
      build {buildId}
    </p>
  );
}
