# API Console for VS Code extension

Based on https://github.com/mulesoft/api-console

## Developing

### Before you start

1. Run `yarn install` to install all dependencies.

1. Run `npm run build:vendor` to build `vendor.js`. The file will appear in the root folder.

### Live previewing

1. Run `npm start` to start the development server.

1. Open `http://127.0.0.1:8000/demo/index.html`.

1. Edit `src/styles.css` and/or `src/api-console.app.js`. The preview will be automatically reloaded on modifications.

### Building

Run `npm run build` to build the API console. The files will appear in the `dist` folder and will be copied to `../extension/assets/api-console/`.

## Useful links

Visual Studio Code Theme Color Reference: https://code.visualstudio.com/api/references/theme-color

Visual Studio Code CSS theme completions plugin: https://github.com/connor4312/vscode-css-theme-completions