import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext", // ensures ESM-only packages like tfjs work
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
