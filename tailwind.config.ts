import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        "theme-bg": "rgb(var(--bg-primary) / <alpha-value>)",
        "theme-bg2": "rgb(var(--bg-secondary) / <alpha-value>)",
        "theme-text": "rgb(var(--text-primary) / <alpha-value>)",
        "theme-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "theme-accent": "rgb(var(--accent-primary) / <alpha-value>)",
        "theme-accent-end": "rgb(var(--accent-primary-end) / <alpha-value>)",
        "theme-card": "rgb(var(--card-bg) / <alpha-value>)",
        "theme-border": "rgb(var(--card-border) / <alpha-value>)",
        "theme-glass": "rgb(var(--surface-glass) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
