# Changelog

## 1.2.1

### New UI items

#### Status bar for the currently selected root API file

The currently selected root API file is shown in the status bar.

If a root API file is selected for current project, the status bar will show a path to it; otherwise,
the status bar will show `No root API file`.

When the status bar is clicked, the `API Contractor: Set a root API file` command is invoked.

#### Status bar for the format of currently opened API file

When an API file is opened, its format will be shown in the status bar.

#### Current API file preview button

When an API file is opened, a button for previewing of the current API file will appear in the editor toolbar.

### Fixes and improvements

* Opening the `exchange.json` file will no longer trigger multiple language server errors.

* Deleting the `exchange.json` file will reset currently set root API file and restart the language server to apply the change.

* When opening a preview for a non-API file with a command, an error message will be shown instead of opening empty API console.

* If there is only one file that can be an API file, it will not be selected automatically until it is checked.

* API Console updated to version 6.4.9.

### Assets

Prebuilt extension: https://access.acronis.com/t/pjtn3nvt

## 1.2.0

### Features

#### Setting a root API file

The `API Contractor: Set a root API file` command is now available to set or switch the root API file for the workspace.
As the result, the `exchange.json` file will be created in the workspace root and contain a relative path to the main API file.
This enables proper linking and validation for separate JSON/YAML files that are linked to the root API file.

If the `exchange.json` file was not found in the workspace during the load, a notification message will appear
with a proposal to set a root API file for the workspace. You can enable automatic detection of the root API file
by enabling the `apiContractor.autoDetectRootApi` option.

The root API file setting does not limit validation of the files that are not linked to the root file.

#### JSON OpenAPI support is back

Possibility to set a root API file resolves an issue, when the diagnostics data would disappear for invalid
JSON/YAML example. Now it is possible to edit JSON OpenAPI definitions.

#### Automatically rename referenced fragments

When the root API file is set, the fragments' references will be automatically updated when their files are renamed.
You can configure this behavior by changing the `apiContractor.autoRenameRefs` option.

### Known issues

Extension errors may appear, when modifying the `exchange.json` file directly.
Use the `API Contractor: Set a root API file` command to change the root API file.

### Assets

Prebuilt extension: https://access.acronis.com/t/7k2ctess

## 1.1.1

1. API files are revalidated on save, file rename and file delete.

1. Extension should no longer stop working properly after long and fast typing sessions.

1. Java detection has been added.

1. Code refactor.

1. ALS binary has been updated.

1. Restrict document selector scheme to `file` to prevent errors when files are opened with unsupported resource scheme.

1. Rebrand to "API Contractor"

### Assets

Prebuilt extension: https://access.acronis.com/t/hre8b9e5

## 1.1.0

Added possibility to preview the API files with the API Console. A command to invoke API file preview is `ALS: Preview current API file`.

### Assets

Prebuilt extension: https://access.acronis.com/t/p42zp05x

## 1.0.0

Initial version with ALS integrated into VS Code.

### Assets

Prebuilt extension: https://access.acronis.com/t/77c1auke