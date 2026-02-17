import solid from "solid-start/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [solid({ adapter: "solid-start-bun" })],
  resolve: {
    alias: {
      "@opencode-ai/ui": path.resolve(__dirname, "./src/core/ui-kit.tsx"),
      "@opencode-ai/console-core": path.resolve(__dirname, "./src/mocks/console-core.ts"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    external: ["bun:sqlite", /^opencode-plugin-/],
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"],
  },
});
