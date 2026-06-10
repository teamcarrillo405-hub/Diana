import type { Config } from "tailwindcss";

const config: Config = {
  // dark: variants must match the CSS token logic in globals.css —
  // explicit .dark class wins, otherwise OS dark applies unless the
  // student explicitly chose light (.light class).
  darkMode: ['variant', [
    '&:where(.dark, .dark *)',
    '@media (prefers-color-scheme: dark) { &:where(:not(.light, .light *)) }',
  ]],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  safelist: [
    { pattern: /bg-(slate|indigo|emerald|amber|rose|sky|violet)-500/ },
    { pattern: /(bg|text|border)-(amber|sky|emerald)-(300|500|700)/ },
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        background: "rgb(var(--bg) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        foreground: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        "surface-soft": "rgb(var(--surface-soft) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-strong": "rgb(var(--brand-strong) / <alpha-value>)",
        "brand-soft": "rgb(var(--brand-soft) / <alpha-value>)",
        "subject-math": "rgb(var(--subject-math) / <alpha-value>)",
        "subject-writing": "rgb(var(--subject-writing) / <alpha-value>)",
        "subject-reading": "rgb(var(--subject-reading) / <alpha-value>)",
        "subject-science": "rgb(var(--subject-science) / <alpha-value>)",
        "subject-history": "rgb(var(--subject-history) / <alpha-value>)",
        "subject-wellness": "rgb(var(--subject-wellness) / <alpha-value>)",
        "subject-ap": "rgb(var(--subject-ap) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
