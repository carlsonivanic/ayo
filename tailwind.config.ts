import type { Config } from "tailwindcss";

// AYO is used one-handed, outdoors, on cheap Android phones. The palette is
// borrowed from warung signage — bottle green ink, a single warung-yellow accent
// reserved for the thing you can act on — and every number is set in mono so
// amounts align to one right edge across the whole app.

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#10312B",
          soft: "#3D5852",
          mute: "#6B807B",
          faint: "#9AAAA5",
        },
        paper: "#F4F6F3",
        surface: "#FFFFFF",
        line: {
          DEFAULT: "#DDE3DE",
          strong: "#C3CDC7",
        },
        accent: {
          DEFAULT: "#F2B705",
          ink: "#3B2C00",
          soft: "#FDF3D4",
        },
        good: { DEFAULT: "#17795E", soft: "#E3F2EC" },
        warn: { DEFAULT: "#B4460F", soft: "#FBEBE2" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(16,49,43,0.04), 0 1px 2px rgba(16,49,43,0.06)",
        lift: "0 8px 30px -12px rgba(16,49,43,0.28)",
      },
      keyframes: {
        tick: {
          "0%": { transform: "scaleY(0.2)", opacity: "0" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        tick: "tick 220ms cubic-bezier(.2,.7,.3,1) both",
        rise: "rise 200ms cubic-bezier(.2,.7,.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
