import type { Config } from "tailwindcss";

/**
 * Audio Jones — Editorial Intelligence Systems.
 * Brand colors/fonts/radius wired as Tailwind utilities. Color values read
 * from the CSS variables defined in app/globals.css (source of truth:
 * design-system/tokens/). Fonts resolve to next/font variables (app/layout.tsx).
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aj: {
          signal: "rgb(var(--aj-signal-rgb) / <alpha-value>)",
          "signal-ink": "var(--aj-signal-ink)",
          data: "rgb(var(--aj-data-rgb) / <alpha-value>)",
          critical: "rgb(var(--aj-critical-rgb) / <alpha-value>)",
          warning: "rgb(var(--aj-warning-rgb) / <alpha-value>)",
          success: "rgb(var(--aj-success-rgb) / <alpha-value>)",
          base: "var(--aj-base)",
          "surface-1": "var(--aj-surface-1)",
          "surface-2": "var(--aj-surface-2)",
          "surface-3": "var(--aj-surface-3)",
          text: "var(--aj-text)",
          "text-secondary": "var(--aj-text-secondary)",
          "text-muted": "var(--aj-text-muted)",
          border: "var(--aj-border)",
          "border-strong": "var(--aj-border-strong)",
          paper: "var(--aj-paper)",
          ink: "var(--aj-ink)",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        control: "4px",
        card: "8px",
      },
      maxWidth: {
        prose: "680px",
        app: "1280px",
        wide: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
