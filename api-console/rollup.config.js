// https://open-wc.org/building/building-rollup.html#configuration

import resolve from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import merge from 'deepmerge';
import path from 'path';
import postcss from 'rollup-plugin-postcss';
import cpy from 'rollup-plugin-cpy';
import { terser } from 'rollup-plugin-terser';
import { isFalsy, pluginWithOptions, dedupedBabelPlugin } from './rollup/utils.js';
import { createBabelConfigRollupBuild } from './rollup/babel.js';

function createRollupConfig(userOptions = {}) {
  const opts = merge(
    {
      developmentMode: !!process.env.ROLLUP_WATCH,
      nodeResolve: true,
      babel: true,
      terser: true,
    },
    userOptions,
  );
  const { developmentMode, rootDir } = userOptions;

  const config = {
    preserveEntrySignatures: false,
    treeshake: !developmentMode,

    output: {
      format: 'es',
      plugins: [],
    },

    plugins: [
      // resolve bare module imports
      pluginWithOptions(resolve, opts.nodeResolve, {
        moduleDirectory: ['node_modules', 'web_modules'],
      }),

      // run babel, compiling down to latest of modern browsers
      dedupedBabelPlugin(
        babel,
        opts.babel,
        createBabelConfigRollupBuild({ developmentMode, rootDir }),
      ),

      // minify js code
      !developmentMode && pluginWithOptions(terser, opts.terser, { format: { comments: false } }),
    ].filter(isFalsy),
  };
  return config;
}

const baseConfig = createRollupConfig();
export default merge(baseConfig, {
  input: path.resolve(__dirname, 'src', 'apic-build.js'),
  context: 'window',
  output: {
    file: path.join(__dirname, 'dist', 'apic-build.js'),
    sourcemap: false
  },
  plugins: [
    postcss(),
    cpy({
      files: ['vendor.js'],
      dest: 'dist',
      options: {
        parents: false,
      },
    }),
  ],
});
