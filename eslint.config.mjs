import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      ".agents/**",
      ".claude/**",
      ".claude-flow/**",
      ".codex/**",
      ".codex-review/**",
      ".gstack/**",
      ".planning/**",
      ".ruflo/**",
      ".ruvector/**",
      ".swarm/**",
      ".tmp/**",
      ".vercel/**",
      ".qa/**",
      "artifacts/**",
      "coverage/**",
      "dist/**",
      "docs/design/**",
      "external/**",
      "export/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "plugins/**",
      "public/design/**",
      "public/vendor/**",
      "test-results/**",
      "tests/fixtures/screendesign.ts",
      "tools/comfyui-mcp/**",
      "transcribe-note/**",
      "vendor/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
