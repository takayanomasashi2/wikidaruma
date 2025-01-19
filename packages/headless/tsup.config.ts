import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  banner: {
    js: "'use client'",
  },
  minify: true,
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  ...options,
}));