import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src/lib",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: "src/lib/index.ts",
      name: "ApiMakerModule",
      fileName: "index",
      formats: ["es", "iife"],
    },
    emptyOutDir: true,
    outDir: "dist",
    target: "esnext",
  },
});
