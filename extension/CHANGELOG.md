# Changelog

## 2.1.11

* AML Language Server updated to [5.1.5](https://github.com/aml-org/als/releases/tag/v5.1.5).

* Updated package dependencies.

## 2.1.10

* The API Console updated to [6.6.15](https://github.com/mulesoft/api-console/releases/tag/v6.6.15).

* Patched API Console `marked` package to fix vulnerability and improve support.

* Updated package dependencies.

## 2.1.9

* AML Language Server updated to [5.1.4](https://github.com/aml-org/als/releases/tag/v5.1.4).

* Updated package dependencies.

## 2.1.8

* AML Language Server updated to [5.1.1](https://github.com/aml-org/als/releases/tag/v5.1.1).

* The API Console updated to [6.6.12](https://github.com/mulesoft/api-console/releases/tag/v6.6.12).

* Updated package dependencies.

## 2.1.7

* AML Language Server updated to [5.1.0](https://github.com/aml-org/als/releases/tag/v5.1.0).

* Updated package dependencies.

## 2.1.6

* AML Language Server updated to [5.0.1](https://github.com/aml-org/als/releases/tag/v5.0.1).

* The API Console updated to [6.6.9](https://github.com/mulesoft/api-console/releases/tag/v6.6.9).

* Updated package dependencies.

## 2.1.5

### Fixes

* AML Language Server has been updated with a fix for whitespace characters in path ([GH-680](https://github.com/aml-org/als/issues/680)).

* Extension will no longer try to provide functionality for API files that have unsupported specification versions or formats.

### Features

Added support for AsyncAPI 2.0.

## 2.1.4

* AML Language Server updated to [4.2.2](https://github.com/aml-org/als/releases/tag/v4.2.2).

* Updated package dependencies.

## 2.1.3

This release uses updated AML Language Server that fixes document formatting for JS variant.

## 2.1.2

This is a hotfix release that fixes document conversion for JS variant.

## 2.1.1

### Updates

* AML Language Server updated to [4.2.0](https://github.com/aml-org/als/releases/tag/v4.2.0).

* Updated package dependencies.

## 2.1.0

### New feature

* Show progress status bar on file rename, file usage and conversion requests.

### Fixes

* Improve performance by removing unnecessary revalidation of all project files on save.

* Improve performance of the JS server version when opening the preview in API Console by avoiding reparsing the JSON response.

* Language server output channel will no longer appear automatically on request errors.

## 2.0.1

This is a hotfix release that fixes NodeJS server startup.

## 2.0.0

### Breaking change

The extension now includes and uses NodeJS variant of the ALS by default.
This results in the following:

* Java is no longer required to run the extension.

* Extension size has been reduced to 2-3mb.

If you experience any issues with NodeJS version or would like to continue using Java version,
you can specify an absolute path to the ALS jar file with the `apiContractor.jvm.jarPath` setting.

The latest jar file can be downloaded from the [extension's github repository](https://github.com/deiteris/api-contractor/blob/master/server/als-server-assembly.jar).

## 1.4.11

### New feature

* Now it is possible to convert the API definition to AMF graph via the conversion command.

### Updates

* AML Language Server updated to [4.1.0](https://github.com/aml-org/als/releases/tag/v4.1.0).

### API preview improvements

* Various improvements to how API Console displays types.

## 1.4.10

### Updates

* AML Language Server updated to [3.2.10](https://github.com/aml-org/als/releases/tag/v3.2.10).

* The API Console updated to [6.5.2](https://github.com/mulesoft/api-console/releases/tag/v6.5.2).

### API preview improvements

* Search has been added to the navigation menu.

### Fixes

* Patch the API Console to fix display of JSON the `allOf` property in RAML definitions.

* Patch the API Console to fix display of array constraint properties.

* Patch the API Console to fix display of the unique array items constraint in RAML definitions.

## 1.4.9

### Updates

* AML Language Server updated to [3.2.9](https://github.com/aml-org/als/releases/tag/v3.2.9).

### API preview improvements

* Fixed colors for the "switch" element.

* Navigation uses custom scrollbar with VSCode-themed colors.

* Increased navigation width.

### Fixes

* Patch the API Console to fix OAuth 2.0 requests when authorization server's `token_type` is `bearer`, but the server expects `Bearer` in the `Authorization` header.

## 1.4.8

### Updates

* AML Language Server updated to [3.2.8-1](https://github.com/aml-org/als/releases/tag/v3.2.8-1).

* The API Console updated to [6.5.0](https://github.com/mulesoft/api-console/releases/tag/6.5.0).

### Fixes

* Patch the API Console to fix appearance of `allOf` JSON schema definition properties.

* When the automatic reload of API preview is enabled, the language server will no longer result in increased memory consumption or crash if the file is saved frequently.

* Fix autocomplete background color in the API preview.

## 1.4.7

### Fixes

Fix origin restriction of HTTP proxy server for API requests to fix Try It functionality in VS Code versions `>=1.57` and `<=1.55`.

## 1.4.6

### New

Added basic API snippets with RAML templates.

### Updates

AML Language Server updated to [3.2.8](https://github.com/aml-org/als/releases/tag/v3.2.8).

## 1.4.5

### Fixes

* When the root API file is set and a referenced file is renamed with automatic references rename enabled, the updated files will be always saved correctly.

### API preview improvements

* Applied styles to the "switch" element.

### Updates

* The API Console updated to [6.4.11](https://github.com/mulesoft/api-console/releases/tag/6.4.11).

* Extension and API Console packages updated.

## 1.4.4

### Security

Update API console packages to fix vulnerabilities.

## 1.4.3

### Fixes

* In cases when the language server is unable to restart, the main API file status bar will show correct main API file that is currently used by the language server.

* When `exchange.json` is modified outside the editor or workspace and the main API file is deleted outside the editor or workspace, the language server will be restarted and the main API file status bar will be updated accordingly.

* Handle possible "language server is not ready" error on document save when the language server is not ready yet.

## 1.4.2

### Improvements and fixes

Detection of the API files is improved. This improvement fixes the following issues:

* RAML files are correctly highlighted in source control diff editor.

* When the root API file is set, external json schemas will have reference links provided.

* When the automatic reload of API preview is enabled and the root API file is set, non-API files that are referenced in the API files will also trigger automatic reload on save.

## 1.4.1

### API preview improvements

If the root API file is set, the API file preview will be updated when its referenced files are saved.

### Documentation

* Readme updated with the new `apiContractor.autoReloadApiPreviewOnSave` option and updated description for `apiContractor.autoDetectRootApi`.

* Added gif with the demonstration of basic language server features.

* Updated documentation for the **API files preview** section in readme.

## 1.4.0

### New

* API preview is reloaded on save by default. This feature is controlled by the new `apiContractor.autoReloadApiPreviewOnSave` option.

### Changes

* API preview now opens in a separate editor column instead of a tab.

* Updated description of the `apiContractor.autoDetectRootApi` option.

### API preview improvements

* Allow custom query string parameters and headers to be provided in Try It.

* Allow custom base URI in Try It.

* Fix highlight color for `null` value in examples.

## 1.3.2

### API preview improvements

* Use VS Code debug token colors to provide proper code highlight.

* Use editor foreground color for preformatted text and code tags.

* Fix colors of documentation that was toggled inside the Try It section.

* Fix color of the file information when uploading a file with multipart form.

* Improve colors for high contrast themes.

* Fix content overflow of the documentation section. Now the items inside the documentation section are scrollable instead of the entire documentation section.

* Fix overflow property of the API console element to reduce bottom scrollbar.

* Fix selection highlight inside code tags.

### Known issues

* Code highlight inside request body editor does not exactly match the highlight inside examples (f.e., json fields have the same color as string values).

* Code highlight in code examples may be inconsistent or incorrect in some cases.

## 1.3.1

### Changes

#### Untrusted workspaces support

The extension will be enabled in untrusted workspaces with all functionality available.

#### Virtual workspaces support

The extension will be disabled in the virtual workspaces due to the current implementation of language server and language server protocol.

### Updates

The API Console updated to [6.4.10](https://github.com/mulesoft/api-console/releases/tag/6.4.10).

### Fixes

* Fix wrong hotkey for suggestions in `README.md`.

* Fix possible error when the API preview is loaded but the loading animation does not disappear and blocks the preview.

* Fix the border style of union type buttons in payload examples.

## 1.3.0

### New

#### JVM arguments

JVM arguments can be provided in the `apiContractor.jvm.arguments` option to control the JVM memory management.
If any errors occur and the language server doesn't start after the change of arguments, execute
`Developer: Toggle Developer Tools` and look for ALS error messages in the `Console` tab.

### Changes

#### Themes support in the API preview

The API Console now uses Visual Studio Code CSS variables to support themes.

Current limitations:

* High contrast themes are poorly supported right now. This may be improved with future releases.

* Code highlighting is not supported in the Try It editor, code snippets section and request/response examples.

#### Extension startup

The extension will start up once the Visual Studio Code is loaded to fix scenarios, when a file is opened without a workspace or
when there are no files in the workspace root.

### Updates

AML Language Server updated to [3.2.7-1](https://github.com/aml-org/als/releases/tag/v3.2.7-1).

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
