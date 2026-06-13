import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: process.env.CAPACITOR ? "./" : process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? "/tsunagaru-mori/" : "/"),
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 540,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/")) return "three-world";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
