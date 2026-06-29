import { ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL belum di-set. Jalankan `npx convex dev` lebih dulu.",
  );
}

export const convex = new ConvexReactClient(url);
