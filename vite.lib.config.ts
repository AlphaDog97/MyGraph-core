import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/lib.ts",
      name: "MyGraphCore",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["cytoscape"],
    },
    emptyOutDir: false,
  },
});
