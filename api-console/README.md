# API Console for VS Code extension

Based on https://github.com/mulesoft/api-console

## Building

1. Run `npm i` to install all dependencies.

1. Run `npm run build` to build the API console. The files will appear in the `dist` folder.

## Embedding the output into extension

1. Rename the javascript file that is formatted like `204c1d73.js` to `apic-build.js` and copy the folder contents (except `index.html`) to `../extension/assets/api-console/`.

1. Remove `link preload` tag.

1. `sw.js` and `workbox-*.js` files can be removed.
