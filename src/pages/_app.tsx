import "@/styles/globals.css";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/Feedback";
import { convex } from "@/lib/convex";

// Plus Jakarta Sans was drawn for Jakarta's own signage programme, which is
// exactly where this app is used; IBM Plex Mono carries every amount and code.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConvexAuthProvider client={convex}>
      <ToastProvider>
        <Head>
          <title>AYO</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <meta name="theme-color" content="#10312B" />
          <link rel="manifest" href="/manifest.webmanifest" />
        </Head>
        <div className={`${sans.variable} ${mono.variable}`}>
          <Component {...pageProps} />
        </div>
      </ToastProvider>
    </ConvexAuthProvider>
  );
}
