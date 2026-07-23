import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  // suppressHydrationWarning: next-themes injects an inline script that sets
  // the `class` (and color-scheme) on <html> BEFORE React hydrates, reading
  // localStorage / prefers-color-scheme. That makes the server-rendered <html>
  // attributes differ from the client's on first paint — a benign mismatch
  // React flags as a hydration error. This opt-out is the next-themes-
  // recommended fix and silences it without affecting any other hydration
  // checks deeper in the tree.
  return (
    <Html lang="id" suppressHydrationWarning>
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
