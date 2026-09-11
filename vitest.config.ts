import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    // The SDK's device-settled routes are off by default while settlement is
    // manual; the path-lock tests still need to exercise them.
    env: { AYO_TRUST_DEVICE_PAYMENTS: "true" },
  },
});
