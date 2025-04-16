import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      syntax: ["node 20"],
      format: "cjs",
    },
    {
      syntax: ["node 20"],
      format: "esm",
    },
  ],
  source: {
    entry: {
      index: "./src/index.js",
    },
  },
});
