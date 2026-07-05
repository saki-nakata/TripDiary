import path from "node:path";
import { config as loadEnv } from "dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/services/**", "src/lib/repositories/**", "src/app/api/**"],
    },
  },
});
