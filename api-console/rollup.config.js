// https://open-wc.org/building/building-rollup.html#configuration

import { createSpaConfig } from '@open-wc/building-rollup';
import merge from 'deepmerge';
import path from 'path';
import postcss from 'rollup-plugin-postcss';
import cpy from 'rollup-plugin-cpy';

const baseConfig = createSpaConfig({
  developmentMode: false,
  injectServiceWorker: false,
});

export default merge(baseConfig, {
  input: path.resolve(__dirname, 'src', 'index.html'),
  context: 'window',
  output: {
    sourcemap: false
  },
  plugins: [
    postcss(),
	cpy({
      files: [
        path.join('vendor.js'),
      ],
      dest: 'dist',
      options: {
        parents: false,
      },
    }),
  ],
});
