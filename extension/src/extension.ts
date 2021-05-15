// TODO: https://docs.42crunch.com/latest/content/concepts/api_contract_security_audit.htm
// TODO: Show if the opened file is linked if main API file is set

import * as net from 'net'
import * as child_process from "child_process"
import * as url from 'url'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as crypto from 'crypto'
import { workspace, ExtensionContext, Uri, commands, window, ViewColumn, OpenDialogOptions, WorkspaceEdit, FileRenameEvent, Position, Range, env } from 'vscode'
import { ApiFormat, findApiFiles } from './features/api-search'
import { LanguageClient, StreamInfo, LanguageClientOptions, CloseAction, ErrorAction } from 'vscode-languageclient/node'
import { checkJava } from './helpers'
import { SerializationPayload, RequestMethod, RenameFilePayload, SerializationResponse, RenameFileResponse, ConversionResponse, ConversionPayload, ConversionFormats, ConversionSyntaxes } from './server-types'
import { Socket } from 'node:net'
import { ChildProcessWithoutNullStreams } from 'node:child_process'
import { ApiDocumentController } from './features/api-document-controller'
import { ApiConsoleProxy } from './features/api-console-proxy'

export const enum ExtensionCommands {
    RestartLanguageServer = 'ac.management.restart',
    PreviewApiFile = 'ac.management.preview',
    SetMainApiFile = 'ac.set.mainFile',
    SetCurrentAsMainApiFile = 'ac.set.currentAsMainFile',
    Convert = 'ac.convert'
}
export const SUPPORTED_EXTENSIONS = ['.raml', '.yaml', '.yml', '.json']
const configFile = 'exchange.json' // TODO: May change soon: https://github.com/aml-org/als/issues/508#issuecomment-820033766

let client: LanguageClient
let clientState: boolean
let socket: Socket
let process: ChildProcessWithoutNullStreams
let apiDocumentController: ApiDocumentController

async function openMainApiSelection(workspaceRoot: string) {
    const options: OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'API files': SUPPORTED_EXTENSIONS.map(ext => { return ext.slice(1) }),
            'All files': ['*']
        },
        defaultUri: Uri.file(workspaceRoot)
    }

    const fileUri = await window.showOpenDialog(options)
    if (fileUri && fileUri[0]) {
        await writeMainApiFile(workspaceRoot, fileUri[0].fsPath)
        commands.executeCommand(ExtensionCommands.RestartLanguageServer)
        return
    }
}

async function writeMainApiFile(workspaceRoot: string, filePath: string) {
    let main = filePath
    if (path.isAbsolute(filePath)) {
        main = path.relative(workspaceRoot, filePath).replace(/\\/g, '/')
        if (main.startsWith('../')) {
            window.showErrorMessage('The root API file cannot be outside the current workspace root.')
            return
        }
    }
    const configPath = path.join(workspaceRoot, configFile)
    await fs.writeJSON(configPath, { main })
    apiDocumentController.updateFilename(main)
}

async function autoRenameRefs(client: LanguageClient, e: FileRenameEvent) {
    for (const file of e.files) {
        const payload: RenameFilePayload = {
            oldDocument: { uri: client.code2ProtocolConverter.asUri(file.oldUri) },
            newDocument: { uri: client.code2ProtocolConverter.asUri(file.newUri) }
        }
        const data: RenameFileResponse = await client.sendRequest(RequestMethod.RenameFile, payload)
        if (!data.edits.documentChanges) {
            return
        }
        const we = new WorkspaceEdit()
        for (const documentChange of data.edits.documentChanges) {
            if ('kind' in documentChange) {
                continue
            }
            for (const edit of documentChange.edits) {
                const uri = Uri.parse(documentChange.textDocument.uri)
                const startPos = new Position(edit.range.start.line, edit.range.start.character)
                const endPos = new Position(edit.range.end.line, edit.range.end.character)
                we.replace(uri, new Range(startPos, endPos), edit.newText)
            }
        }
        const res = workspace.applyEdit(we)
        if (res) {
            workspace.saveAll(false)
        }
    }
}

async function checkMainApiFile(workspaceRoot: string, disableAutodetect = false) {
    const candidates = await findApiFiles(workspaceRoot)
    if (!candidates.length) {
        return
    }
    const autoDetectRootApi = workspace.getConfiguration('apiContractor').get('autoDetectRootApi')
    if (autoDetectRootApi && !disableAutodetect) {
        if (candidates.length > 1) {
            window.showInformationMessage('There are multiple root API files in the workspace root. Please select a root API file manually.', 'Select file').then(async (selection) => {
                if (selection) {
                    await openMainApiSelection(workspaceRoot)
                }
            })
            return
        }
        const rootFile = candidates[0]
        await writeMainApiFile(workspaceRoot, rootFile)
        window.showInformationMessage(`The "${rootFile}" has been automatically selected as the root API file.`)
        return
    }
    const notifyNoMainApiFile = workspace.getConfiguration('apiContractor').get('notification.noMainApiFileSet')
    if (notifyNoMainApiFile) {
        window.showInformationMessage('The root API file is not set for this workspace. Would you like to set a root API file?', 'Select file').then(async (selection) => {
            if (selection) {
                await openMainApiSelection(workspaceRoot)
            }
        })
    }
}

async function readMainApiFile(workspaceRoot: string | undefined, disableAutodetect = false) {
    if (!workspaceRoot) {
        return
    }
    try {
        const configPath = path.join(workspaceRoot, configFile)
        const data = await fs.readJSON(configPath)
        try {
            await fs.access(path.join(workspaceRoot, data.main))
        } catch {
            await fs.remove(configPath)
            throw Error
        }
        apiDocumentController.updateFilename(data.main)
    } catch {
        apiDocumentController.updateFilename(undefined)
        await checkMainApiFile(workspaceRoot, disableAutodetect)
    }
}

// TODO: Conversion formats can be obtained from client.initializeResult.conversion
async function showTargetFormatPick(fromFormat: ApiFormat): Promise<ConversionFormats | undefined> {
    if (fromFormat.type === ConversionFormats.RAML08) {
        window.showErrorMessage('Conversion from RAML 0.8 is not supported.')
        return
    }
    let formats
    if (fromFormat.type === ConversionFormats.RAML10) {
        formats = [
            ConversionFormats.OAS20,
            ConversionFormats.OAS30
        ]
    } else {
        formats = [
            ConversionFormats.OAS20,
            ConversionFormats.OAS30,
            ConversionFormats.RAML10
        ]
    }
    return <ConversionFormats>await window.showQuickPick(formats, { placeHolder: 'Select conversion format' })
}

async function showTargetSyntaxPick(fromFormat: ConversionFormats, fromSyntax: ConversionSyntaxes, toFormat: ConversionFormats): Promise<ConversionSyntaxes | undefined> {
    if (toFormat === ConversionFormats.RAML10) {
        return ConversionSyntaxes.RAML
    }
    const syntaxes = [
        ConversionSyntaxes.JSON,
        ConversionSyntaxes.YAML
    ].filter(toSyntax => {
        if (fromFormat === toFormat && toSyntax === fromSyntax) {
            return false
        }
        return true
    })
    return <ConversionSyntaxes>await window.showQuickPick(syntaxes, { placeHolder: 'Select conversion syntax' })
}

export async function activate(ctx: ExtensionContext) {

    const res = await checkJava()
    if (!res) {
        throw Error
    }

    const documentSelector = [
        { scheme: 'file', language: 'raml' },
        { scheme: 'file', language: 'yaml-api' },
        { scheme: 'file', language: 'json-api' }
    ]
    commands.executeCommand('setContext', 'ac.documentSelector', documentSelector.map((item) => { return item.language }))

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for provided document selectors
        documentSelector,
        synchronize: {
            configurationSection: 'apiContractor',
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        },
        uriConverters: {
            code2Protocol: uri => new url.URL(uri.toString(true)).href,
            protocol2Code: str => Uri.parse(str)
        },
        // TODO: Maybe improve error handling
        errorHandler: {
            error: () => {
                return ErrorAction.Continue
            },
            closed: () => {
                return CloseAction.Restart
            }
        }
    }

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.SetMainApiFile, async () => {
        if (!clientState) {
            window.showErrorMessage('Language server is not ready yet. Try setting the root API file again in a few seconds.')
            return
        }
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return
        }
        await openMainApiSelection(workspaceRoot)
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.SetCurrentAsMainApiFile, async (textEditor) => {
        if (!clientState) {
            window.showErrorMessage('Language server is not ready yet. Try setting the root API file again in a few seconds.')
            return
        }
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return
        }
        const document = textEditor.document
        await writeMainApiFile(workspaceRoot, document.fileName)
        commands.executeCommand(ExtensionCommands.RestartLanguageServer)
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.Convert, async (textEditor) => {
        if (!clientState) {
            window.showErrorMessage('Language server is not ready yet. Try converting again in a few seconds.')
            return
        }
        const document = textEditor.document
        const apiFormat = await apiDocumentController.readApiFileFormat(document)
        if (!apiFormat) {
            return
        }
        const target = await showTargetFormatPick(apiFormat)
        if (!target) {
            return
        }
        const syntax = await showTargetSyntaxPick(<ConversionFormats>apiFormat.type, <ConversionSyntaxes>apiFormat.syntax, target)
        if (!syntax) {
            return
        }
        const uri = client.code2ProtocolConverter.asUri(document.uri)
        const payload: ConversionPayload = { uri, target, syntax }
        const data: ConversionResponse = await client.sendRequest(RequestMethod.Conversion, payload)
        const filename = path.basename(document.fileName, path.extname(document.fileName))
        const filePath = path.join(path.dirname(document.fileName), `${filename}.${syntax}`)
        await fs.writeFile(filePath, data.content)
        commands.executeCommand('vscode.open', Uri.file(filePath))
    }))

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.RestartLanguageServer, () => {
        if (!clientState) {
            window.showErrorMessage('Language server is not ready yet. Try restarting again in a few seconds.')
            return
        }
        clientState = false
        client.diagnostics?.clear()
        socket.emit('close')
        process.kill()
        client.onReady().then(() => {
            clientState = true
        })
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.PreviewApiFile, async (textEditor) => {
        if (!clientState) {
            window.showErrorMessage('Language server is not ready yet. Try previewing again in a few seconds.')
            return
        }
        const document = textEditor.document
        const uri = client.code2ProtocolConverter.asUri(document.uri)
        const panel = window.createWebviewPanel(
            'apiFilePreview',
            `API Console: ${path.basename(uri)}`,
            ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(ctx.extensionPath, 'assets', 'api-console'))],
                retainContextWhenHidden: true
            }
        )
        panel.webview.onDidReceiveMessage(async (event) => {
            if (event.ready === true) {
                const payload: SerializationPayload = { documentIdentifier: { uri } }
                const data: SerializationResponse = await client.sendRequest(RequestMethod.Serialization, payload)
                panel.webview.postMessage(data.content)
            }
        }, undefined, ctx.subscriptions)

        panel.onDidDispose(() => {
            apicProxy.stop()
        }, undefined, ctx.subscriptions)

        const vendorJs = path.join(ctx.extensionPath, 'assets', 'api-console', 'vendor.js')
        const apicJs = path.join(ctx.extensionPath, 'assets', 'api-console', 'apic-build.js')
        const vendorJsUri = panel.webview.asWebviewUri(Uri.file(vendorJs))
        const apicBuildJsUri = panel.webview.asWebviewUri(Uri.file(apicJs))

        let authority = vendorJsUri.authority
        if (authority.indexOf('.') !== -1) {
            authority = authority.slice(0, authority.indexOf('.'))
        }
        const origin = `vscode-webview://${authority}`
        const nonce = crypto.randomBytes(16).toString('base64')
        const apicProxy = new ApiConsoleProxy(origin)
        const httpPort = await apicProxy.run()
        const webServerUri = await env.asExternalUri(Uri.parse(`http://127.0.0.1:${httpPort}`))
        panel.webview.html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${panel.webview.cspSource} 'nonce-${nonce}'; style-src ${panel.webview.cspSource} 'unsafe-inline'; connect-src ${webServerUri}" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
                <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1,user-scalable=yes">
                <title>API Console</title>
            </head>
            <body>
                <script src="${vendorJsUri.toString()}"></script>
                <api-console-app app rearrangeEndpoints proxy="${webServerUri}proxy?url=" proxyEncodeUrl redirectUri="${webServerUri}oauth-callback"></api-console-app>
                <div id="loader">
                    <div class="lds-dual-ring"></div>
                </div>
                <script type="module" src="${apicBuildJsUri.toString()}"></script>
                <script nonce="${nonce}">
                    (function() {
                        document.addEventListener('WebComponentsReady', function () {
                            if (!window.ShadyCSS) {
                                return;
                            }

                            function shouldAddDocumentStyle(n) {
                                return n.nodeType === Node.ELEMENT_NODE && n.localName === 'style' && !n.hasAttribute('scope');
                            }
                            const CustomStyleInterface = window.ShadyCSS.CustomStyleInterface;

                            const candidates = document.querySelectorAll('style');
                            for (let i = 0; i < candidates.length; i++) {
                                const candidate = candidates[i];
                                if (shouldAddDocumentStyle(candidate)) {
                                    CustomStyleInterface.addCustomStyle(candidate);
                                }
                            }
                        });

                        window.addEventListener('message', function (e) {
                            const apic = document.querySelector('api-console-app');
                            const loader = document.querySelector('#loader');
                            const model = JSON.parse(e.data);
                            apic.amf = model;
                            loader.style.display = 'none';
                        });

                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            ready: true
                        }, '*');
                    })();
                </script>
            </body>
        </html>`
    }))

    apiDocumentController = new ApiDocumentController(documentSelector)
    ctx.subscriptions.push(apiDocumentController)

    await readMainApiFile(workspace.rootPath)

    // Create the language client and start the client.
    client = new LanguageClient(
        'apiContractor',
        'API Contractor',
        createServer,
        clientOptions
    )

    // Start the client. This will also launch the server
    ctx.subscriptions.push(client.start())

    client.onReady().then(async () => {
        clientState = true

        ctx.subscriptions.push(workspace.onDidSaveTextDocument(async () => {
            // TODO: Apparently the "textDocument/didSave" method has dummy implementation,
            // https://github.com/aml-org/als/blob/develop/als-server/jvm/src/main/scala/org/mulesoft/als/server/lsp4j/TextDocumentServiceImpl.scala#L88
            await revalidate()
        }))

        ctx.subscriptions.push(workspace.onDidRenameFiles(async (e) => {
            const autoDetectRootApi = workspace.getConfiguration('apiContractor').get('autoRenameRefs')
            switch (autoDetectRootApi) {
                case 'never':
                    break
                case 'always':
                default:
                    await autoRenameRefs(client, e)
                    break
            }
            await revalidate()
        }))

        ctx.subscriptions.push(workspace.onDidDeleteFiles(async (e) => {
            for (const file of e.files) {
                if (path.basename(file.fsPath) === configFile || path.basename(file.fsPath) === apiDocumentController.filename) {
                    await readMainApiFile(workspace.rootPath, true)
                    commands.executeCommand(ExtensionCommands.RestartLanguageServer)
                }
            }

            await revalidate()
        }))
    })

    async function revalidate() {
        for (const file of workspace.textDocuments) {
            if (file.uri.scheme !== 'file' || !documentSelector.some(selector => selector.language === file.languageId)) {
                return
            }
            if (client.diagnostics) {
                client.diagnostics.set(file.uri, [])
            }
            const contents = await fs.readFile(file.fileName, 'utf8')
            const data = {
                textDocument: {
                    uri: `${file.uri.scheme}://${file.uri.path}`,
                    version: file.version
                },
                contentChanges: [
                    {
                        text: contents
                    }
                ]
            }
            client.sendNotification('textDocument/didChange', data)
        }
    }

    function createServer(): Promise<StreamInfo> {

        return new Promise((resolve) => {
            const server = net.createServer(s => {
                console.log("[ALS] Socket created")

                socket = s
                resolve({
                    reader: socket,
                    writer: socket,
                })

                socket.on('end', () => console.log("[ALS] Disconnected"))
            }).on('error', (err) => { throw err })

            server.listen(0, '127.0.0.1', () => {
                const jarPath = ctx.asAbsolutePath(path.join('assets', 'als-server-assembly.jar'))

                const address = server.address()
                if (!address) {
                    throw Error
                }
                const port = typeof address === 'object' ? address.port : 0

                const options = {
                    cwd: workspace.rootPath,
                }

                const jvmArgs = <string[]>workspace.getConfiguration('apiContractor').get('jvm.arguments')
                const args = jvmArgs.concat([
                    '-jar',
                    jarPath,
                    '--port',
                    port.toString()
                ])
                console.log(`[ALS] Spawning at port: ${port}`)
                process = child_process.spawn("java", args, options)

                // See https://github.com/aml-org/als/issues/504
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                process.stdout.on('data', () => { })
                process.stderr.on('data', (data) => { console.log(`[ALS] ${data.toString()}`) })
            })
        })
    }
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}