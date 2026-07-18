import { execSync } from "node:child_process";

/**
 * Short git commit hash this production build was created from, so the running
 * app can surface exactly which commit is deployed (e.g. on the login page).
 * Falls back to "dev" when git is unavailable (e.g. some CI stripped checkouts).
 */
function gitCommitShort() {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const commitShort = gitCommitShort();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // Bake the git commit into the build so the deployed app can identify itself.
  // This also drives the .next/BUILD_ID file and Next's error overlay.
  generateBuildId: () => commitShort,
  // Expose the same value to client bundles (NEXT_PUBLIC_* is inlined at build).
  env: {
    NEXT_PUBLIC_BUILD_ID: commitShort,
  },
};

export default nextConfig;
