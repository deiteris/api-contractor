# Changelog

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
