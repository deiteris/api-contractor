/* eslint-disable import/no-extraneous-dependencies */
const server = require('es-dev-server');

const config = server.createConfig({
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
});
server.startServer(config);