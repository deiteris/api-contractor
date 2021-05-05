# API Contractor for Visual Studio Code [![Version](https://vsmarketplacebadge.apphb.com/version-short/deiteris.vs-api-contractor.svg)](https://marketplace.visualstudio.com/items?itemName=deiteris.vs-api-contractor)

## Overview

An extension for Visual Studio Code that provides intellisense, validation and other features
for the API contracts editing using [AML Language Server (ALS)](https://github.com/aml-org/als#aml-language-server)
and previewing with [the Mulesoft API Console](https://github.com/mulesoft/api-console).

Note: the extension size is 50-60mb due to the JVM binary of language server included into the extension.

## What types of documents are supported?

See supported types of documents: https://github.com/aml-org/als#what-is-als

## Requirements

* [Visual Studio Code 1.54 or newer](https://code.visualstudio.com/Download)
* [Java 1.8 or newer](https://www.java.com/en/download/manual.jsp)

## Available commands

* `API Contractor: Restart language server` - Restarts the client and language server.
* `API Contractor: Preview current API file` - Opens current API file in the API console.
* `API Contractor: Set current API file as root file` - Writes the `exchange.json` file to workspace root with the relative path to current API file.
* `API Contractor: Convert current API file` - Shows the option menus with available conversion formats and syntaxes and converts the current API file according to the selections.

## Available settings

* `apiContractor.trace.server` - Traces the communication between VS Code and the language server.
* `apiContractor.autoDetectRootApi` - Enables the root API file auto detection.
* `apiContractor.autoRenameRefs` - Configures automatic rename of the referenced files. Works only when the workspace has the root API file set.

## Features

### Functionality

#### Language

Language functionality relies on [LSP support in ALS](https://github.com/aml-org/als#lsp-support-in-als). You
can find currently supported features there.

#### Custom

##### Setting a root API file

The `API Contractor: Set current API file as root file` command allows setting the root API file for the current workspace.
As the result, the `exchange.json` file will be created in the workspace root and contain a relative path to the main API file.
This enables proper linking and validation for separate JSON/YAML files that are linked to the root API file.

If the `exchange.json` file was not found in the workspace during the load or there are multiple API files,
a notification message will appear with a proposal to set a root API file for the workspace. You can enable
automatic detection of the root API file by enabling the `apiContractor.autoDetectRootApi` option.

The root API file setting does not limit validation of the files that are not linked to the root API file.

##### Automatically rename referenced fragments

When the root API file is set, the fragments' references will be automatically updated when their files are renamed.
You can configure this behavior by changing the `apiContractor.autoRenameRefs` option.

##### API files preview

Currently opened API file can be previewed and tried out with the API Console. A command to invoke API file preview is `ALS: Preview current API file`.

#### API format conversion

The `API Contractor: Convert current API file` command allows converting currently opened API file. When the command
is invoked, the pick menu will appear with supported conversion formats. After the conversion is done, a new API file
in selected format will appear.

Note:

* Due to the differences between formats, some format-specific features may be lost or preserved as metadata in `x-amf` tags that need to be post-processed.

* Unused types will be lost during the conversion.

* If there is a file with the same name as the resulting API file, it will be overwritten.

### UI elements

#### Status bar for the currently selected root API file

If a root API file is selected for current project, the status bar will show a path to it; otherwise,
the status bar will show `No root API file`.

When the status bar is clicked, the `API Contractor: Set a root API file` command is invoked.

#### Status bar for the format of currently opened API file

When an API file is opened, its format will be shown in the status bar.

When the status bar is clicked, the `API Contractor: Convert current API file` command is invoked.

#### Current API file preview button

When an API file is opened, a button for previewing of the current API file will appear in the editor toolbar.

## Known issues

### Pattern error with valid named capture groups

Since the extension uses JVM version of the language server (JS version is experimental), the patterns are validated
according to the Java rules. See [Java Class Pattern documentation](https://docs.oracle.com/en/java/javase/16/docs/api/java.base/java/util/regex/Pattern.html).
If a named capture group is [valid according to the ECMA-262 regular expression dialect](http://json-schema.org/draft/2020-12/json-schema-validation.html#rfc.section.7.3.8), remove it to proceed further with validation, then change it back once the document is valid.

## FAQ

### How to enable autocomplete?

To enable autocomplete and snippets on typing, enable the `editor.quickSuggestions` setting in VS Code. Otherwise,
use the `CTRL+B` hotkey.

## Development

Before you start, run `npm install` in this folder to install all package dependencies.

### Debugging

* Open VS Code on this folder.
* Press `Ctrl+Shift+B` and select `npm: compile` to compile the extension.
* Open `./src/extension.ts` and press `Ctrl+Shift+D` to switch to debugging menu.
* Click **Run and Debug** to start debugging.

### Packaging

Run `vsce package` in this folder. This will compile and pack the extension into the `.vsix` file.
