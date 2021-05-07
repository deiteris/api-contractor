# Changelog

## 1.2.2

### Updates

AML Language Server updated to [3.2.7](https://github.com/aml-org/als/releases/tag/v3.2.7).

### Changes

Root API file will not be automatically detected if `exchange.json` or root API file is deleted to prevent restarting the language server twice.

### Improvements

* Root API file is automatically detected before the language server starts. This reduces the necessity to restart the language server after it was loaded during extension activation and should improve extension initialization speed.

* API file controller is initialized before the language server starts. This should improve the initialization speed of text highlight and UI.

## 1.2.1

### Changes

* The API file preview shows loading animation.

* When API file preview is loaded, the `Summary` section will be selected by default when available.

### Security

Restrict local servers to listen only on `127.0.0.1`.

### Fixes

Fix the Try It functionality for VS Code 1.56.

## 1.2.0

### Features

#### The API Console "Try It" functionality

Now it is possible to use the Try It functionality in the opened API preview.

Note: the OAuth 2.0 `Authorization code (server flow)` response type will not work due to the VS Code webview API limitations.

### Changes

* An error message is shown in cases when a language server is not ready to execute commands that depend on it.

  This prevents issues in the following cases:

  * When `exchange.json` is deleted, the language server may be not ready to restart.

  * When a command is executed and language server is not ready, erroneous or confusing behavior may occur.
    For example, opening an API file preview when language server is restarting would result in empty API console without any notifications.

* Enhanced security of the preview tab by enforcing the [`Content-Security-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) rules.

### Fixes

* Eliminated a lag when opening an API file preview.

* Updated commands in README.

* When `exchange.json` is deleted, the extension will no longer wait for input to restart the language server.

## 1.1.0

### Features

#### API format conversion

Now the extension includes the `API Contractor: Convert current API file` command to convert currently opened API file.

When the API file is opened, click the status bar with API file format. You will be prompted
to choose the target format and syntax (only for OpenAPI format).

### Changes

* The `apiContractor.notification.noMainApiFileSet` option is added to control notification when no root API file is set.

* With the root API file auto detection enabled, the API files with the following names will be automatically selected
  if present in the workspace root: `api.raml`, `api.json`, `api.yaml`, `api.yml`.

* Language codes were changed for API formats. Now API in JSON syntax has the `json-api` code, and in YAML syntax - `yaml-api`.

* Root API file auto detection is enabled by default. To disable it, uncheck the `Api Contractor: Auto Detect Root Api` option in the extension settings.

### Fixes

* OAS 3.0 in JSON is correctly detected and displayed in the status bar of API file format.

* Commands, which require API files, will be hidden from the command palette if the currently focused editor does not have an API file.

* Fix "socket write after end" error on language server restart.

* Add language server restart when `exchange.json` is deleted to correct the behavior of the language server.

* Fix possible language server errors when `exchange.json` is deleted.

* Fix behavior when the main API file is deleted. The status bar will display "No root API file" and `exchange.json` will be automatically deleted.

* The language server will no longer be triggered by files that don't have corresponding API heading.

* Fix document selector to detect RAML files with YAML extensions.

* Extension will no longer ask to set a root API file when workspace root does not contain any API files.

## 1.0.1

This is a hotfix release.

Fix incorrect behavior of UI elements. Now they should appear correctly depending on the current active text editor.

## 1.0.0

First public release.
