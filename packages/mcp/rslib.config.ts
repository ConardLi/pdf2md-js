import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      syntax: ['node 20'],
      format: 'cjs',
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
});
