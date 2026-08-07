import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        brand: "var(--brand)",
        accent: "var(--accent)",
        whatsapp: "var(--whatsapp)",
        border: "var(--border)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Fixed type scale from DESIGN_SYSTEM.md — don't add ad-hoc sizes.
        caption: ["0.8125rem", { lineHeight: "1.15rem" }],
        body: ["1rem", { lineHeight: "1.55rem" }],
        section: ["1.625rem", { lineHeight: "2rem" }],
        hero: ["2.75rem", { lineHeight: "3.1rem" }],
      },
    },
  },
  plugins: [],
};
export default config;
