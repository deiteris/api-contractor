// Adopted from https://github.com/open-wc/open-wc/blob/master/packages/building-rollup/src/babel/babel-configs.js

import { isFalsy } from './utils.js';

export const createBabelConfigRollupBuild = ({ developmentMode, rootDir }) => ({
  babelHelpers: 'bundled',
  compact: true,
  presets: [
    [
      require.resolve('@babel/preset-env'),
      {
        // Chromium 87.0.4280.141 is used starting from VS Code 1.53.0
        targets: "Chrome >= 87",
        useBuiltIns: false,
        shippedProposals: true,
        modules: false,
        bugfixes: true,
      },
    ],
  ],
  plugins: [
    // plugins that aren't part of @babel/preset-env should be applied regularly in
    // the rollup build phase
    [require.resolve('babel-plugin-bundled-import-meta'), { bundleDir: rootDir }],
    !developmentMode && [
      require.resolve('babel-plugin-template-html-minifier'),
      {
        modules: {
          'lit-html': ['html'],
          'lit-element': ['html', { name: 'css', encapsulation: 'style' }],
        },
        logOnError: true,
        failOnError: false,
        strictCSS: true,
        htmlMinifier: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          removeComments: true,
          caseSensitive: true,
          minifyCSS: true,
        },
      },
    ],
  ].filter(isFalsy),
});