import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "src/constants/index": "src/constants/index.ts",
    "src/types/index": "src/types/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  outDir: ".dist",
  clean: true,
  splitting: false,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".js" : ".mjs",
    };
  },
});
