import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ThemeProvider } from "next-themes";
import { convex } from "@/lib/convex";
import { RouteGuard } from "@/components/RouteGuard";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConvexAuthProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <RouteGuard>
          <Component {...pageProps} />
        </RouteGuard>
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}
