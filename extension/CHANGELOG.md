# Changelog

## 1.0.2

### Features

#### API format conversion

Now the extension includes the `API Contractor: Convert current API file` command to convert currently opened API file.

When the API file is opened, click the status bar with API file format. You will be prompted
to choose the target format and syntax (for OAS).

### Fixes

* OAS 3.0 in JSON is correctly detected and displayed in the status bar of API file format.

* Commands, which require API files, will be hidden from the command palette if currently focused editor does not have an API file.

* Fix "socket write after end" error on language server restart.

* Add language server restart when `exchange.json` is deleted to correct behavior of the language server.

## 1.0.1

This is a hotfix release.

Fix incorrect behavior of UI elements. Now they should appear correctly depending on the current active text editor.

## 1.0.0

First public release.
