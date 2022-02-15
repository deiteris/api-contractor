/* eslint-disable import/no-extraneous-dependencies */
const server = require('@web/dev-server');

const config = {
  watch: true,
  nodeResolve: true,
  appIndex: 'index.html',
  moduleDirs: ['node_modules'],
  logStartup: true,
  openBrowser: true,
  compatibility: 'auto',
  babelExclude: [
    '**/vendor.js'
  ]
}
server.startDevServer({config});