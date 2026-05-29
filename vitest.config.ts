import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "components/**/*.test.ts", "components/**/*.test.tsx", "app/**/*.test.ts", "app/**/*.test.tsx"],
  },
});
