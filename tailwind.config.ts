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
      // Quiet Command optical type scale — 1.2 ratio, six semantic sizes.
      // Display sizes tighten tracking; captions never carry long copy.
      fontSize: {
        caption: ["0.8125rem", { lineHeight: "1.5" }],
        body: ["1rem", { lineHeight: "1.55" }],
        emphasis: ["1.1875rem", { lineHeight: "1.45" }],
        title: ["1.4375rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        display: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        hero: ["2.125rem", { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" }],
      },
      // Three named gaps — the whole app breathes on this rhythm.
      spacing: {
        tight: "0.5rem",
        group: "1rem",
        section: "1.75rem",
      },
      borderRadius: {
        control: "0.75rem",
        card: "1rem",
        panel: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
