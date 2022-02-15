// TODO: https://docs.42crunch.com/latest/content/concepts/api_contract_security_audit.htm
// TODO: Show if the opened file is linked if main API file is set

import * as net from 'net'
import * as child_process from "child_process"
import * as url from 'url'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as crypto from 'crypto'
import { workspace, ExtensionContext, Uri, commands, window, ViewColumn, OpenDialogOptions, WorkspaceEdit, FileRenameEvent, Position, Range, env, Disposable, RelativePattern, ProgressLocation } from 'vscode'
import { ApiFormat, findApiFiles } from './features/api-search'
import { LanguageClient, StreamInfo, LanguageClientOptions, CloseAction, ErrorAction, State, RevealOutputChannelOn, ServerOptions } from 'vscode-languageclient/node'
import { checkJarFile, checkJava } from './helpers'
import { SerializationPayload, RequestMethod, RenameFilePayload, SerializationResponse, RenameFileResponse, ConversionResponse, ConversionPayload, ConversionFormats, ConversionSyntaxes, CleanDiagnosticTreePayload } from './server-types'
import { Socket } from 'net'
import { ChildProcess, ChildProcessWithoutNullStreams } from 'child_process'
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
export const configFile = 'exchange.json' // TODO: May change soon: https://github.com/aml-org/als/issues/508#issuecomment-820033766

let client: MyLanguageClient
let socket: Socket
let process: ChildProcess | ChildProcessWithoutNullStreams
let apiDocumentController: ApiDocumentController

export class MyLanguageClient extends LanguageClient {
    private _isReady = false

    constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean) {
        super(id, name, serverOptions, clientOptions, forceDebug)
    }

    get isReady() {
        return this._isReady
    }

    set isReady(state: boolean) {
        this._isReady = state
    }
}

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
}

async function autoRenameRefs(client: LanguageClient, e: FileRenameEvent) {
    for (const file of e.files) {
        const payload: RenameFilePayload = {
            oldDocument: { uri: client.code2ProtocolConverter.asUri(file.oldUri) },
            newDocument: { uri: client.code2ProtocolConverter.asUri(file.newUri) }
        }
        const data: RenameFileResponse = await window.withProgress({location: ProgressLocation.Window, cancellable: false, title: 'Renaming references'}, async () => {
            return client.sendRequest(RequestMethod.RenameFile, payload)
        })
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
        const res = await workspace.applyEdit(we)
        if (res) {
            workspace.saveAll(false)
        }
    }
}

async function checkMainApiFile(workspaceRoot: string) {
    const candidates = await findApiFiles(workspaceRoot)
    if (!candidates.length) {
        return
    }
    const autoDetectRootApi = workspace.getConfiguration('apiContractor').get('autoDetectRootApi')
    if (autoDetectRootApi) {
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

async function readMainApiFile(workspaceRoot: string): Promise<boolean> {
    try {
        const configPath = path.join(workspaceRoot, configFile)
        const data = await fs.readJSON(configPath)
        try {
            await fs.access(path.join(workspaceRoot, data.main))
        } catch {
            await fs.remove(configPath)
            throw Error
        }
        await apiDocumentController.updateMainFile(data.main)
        return true
    } catch {
        await apiDocumentController.updateMainFile(undefined)
        return false
    }
}

// TODO: Conversion formats can be obtained from client.initializeResult.conversion
async function showTargetFormatPick(fromFormat: ApiFormat): Promise<ConversionFormats | undefined> {
    if ([ConversionFormats.RAML08, ConversionFormats.ASYNC20].includes(<ConversionFormats>fromFormat.type)) {
        window.showErrorMessage(`Conversion from ${fromFormat.type} is not supported.`)
        return
    }
    const formats = [
        ConversionFormats.OAS20,
        ConversionFormats.OAS30
    ]
    if (fromFormat.type !== ConversionFormats.RAML10) {
        formats.push(ConversionFormats.RAML10)
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

    const jvmPath = <string | undefined>workspace.getConfiguration('apiContractor').get('jvm.jarPath')
    if (jvmPath) {
        if (!await checkJava()) {
            return
        }
        if (!await checkJarFile(jvmPath)) {
            return
        }
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
        },
        revealOutputChannelOn: RevealOutputChannelOn.Never
    }

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.SetMainApiFile, async () => {
        if (!client.isReady) {
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
        if (!client.isReady) {
            window.showErrorMessage('Language server is not ready yet. Try setting the root API file again in a few seconds.')
            return
        }
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return
        }
        const document = textEditor.document
        await writeMainApiFile(workspaceRoot, document.fileName)
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.Convert, async (textEditor) => {
        if (!client.isReady) {
            window.showErrorMessage('Language server is not ready yet. Try converting again in a few seconds.')
            return
        }
        if (!apiDocumentController.mainFile) {
            window.showErrorMessage('Please select the main API file to perform the conversion.')
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
        const data: ConversionResponse = await window.withProgress({location: ProgressLocation.Window, cancellable: false, title: 'Conversion in progress'}, async () => {
            return client.sendRequest(RequestMethod.Conversion, payload)
        })
        const filename = path.basename(document.fileName, path.extname(document.fileName))
        const filePath = path.join(path.dirname(document.fileName), `${filename}.${syntax}`)
        await fs.writeFile(filePath, data.model)
        commands.executeCommand('vscode.open', Uri.file(filePath))
    }))

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.RestartLanguageServer, async () => {
        // TODO: Must select or receive a workspace folder from a parameter to restart the language server
        if (!client.isReady) {
            window.showErrorMessage('Language server is not ready yet. Try restarting again in a few seconds.')
            return
        }
        if (workspace.rootPath) {
            await readMainApiFile(workspace.rootPath)
        }
        client.diagnostics?.clear()
        socket.emit('close')
        process.kill()
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.PreviewApiFile, async (textEditor) => {
        if (!client.isReady) {
            window.showErrorMessage('Language server is not ready yet. Try previewing again in a few seconds.')
            return
        }
        const document = textEditor.document
        const uri = client.code2ProtocolConverter.asUri(document.uri)
        const panel = window.createWebviewPanel(
            'apiFilePreview',
            `API Console: ${path.basename(uri)}`,
            ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(ctx.extensionPath, 'assets', 'api-console'))],
                retainContextWhenHidden: true
            }
        )

        async function sendSerializedDocument() {
            const payload: SerializationPayload = { documentIdentifier: { uri } }
            const data: SerializationResponse = await client.sendRequest(RequestMethod.Serialization, payload)
            if (typeof data.model === 'string') {
                panel.webview.postMessage({ content: JSON.parse(data.model) })
            } else {
                panel.webview.postMessage({ content: data.model })
            }
        }

        const autoReloadPreview = workspace.getConfiguration('apiContractor').get('autoReloadApiPreviewOnSave')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        let documentWatcher = new Disposable(() => { })
        // TODO: Maybe this can be reworked with vscode CancellationToken but doesn't seem to work well.
        let serializationInProgress = false
        if (autoReloadPreview) {
            documentWatcher = workspace.onDidSaveTextDocument(async (textDocument) => {
                if (!client.isReady) {
                    return
                }
                if (serializationInProgress) {
                    return
                }
                // If the current file is not an API file but referenced, revalidate it manually in order to update the content on the language server
                if (apiDocumentController.fileUsage.length) {
                    const payload: CleanDiagnosticTreePayload = { textDocument: { uri: client.code2ProtocolConverter.asUri(textDocument.uri) } }
                    await client.sendRequest(RequestMethod.CleanDiagnosticTree, payload)
                }
                // Opened API file doesn't include itself in the fileUsage list.
                // Check whether the saved file is the opened file or if it's a referenced file and rebuild model for the opened file.
                if (textDocument.fileName === document.fileName || apiDocumentController.fileUsage.length) {
                    serializationInProgress = true
                    panel.webview.postMessage({ reload: true })
                    await sendSerializedDocument()
                    serializationInProgress = false
                }
            })
        }

        let apicProxy: ApiConsoleProxy
        panel.webview.onDidReceiveMessage(async (event) => {
            if (event.ready === true) {
                apicProxy = new ApiConsoleProxy(event.origin)
                serializationInProgress = true
                await sendSerializedDocument()
                serializationInProgress = false
                const httpPort = await apicProxy.run()
                const webServerUri = (await env.asExternalUri(Uri.parse(`http://127.0.0.1:${httpPort}`))).toString()
                panel.webview.postMessage({
                    serverUri: webServerUri
                })
            }
        }, undefined, ctx.subscriptions)

        panel.onDidDispose(() => {
            apicProxy.stop()
            documentWatcher.dispose()
        }, undefined, ctx.subscriptions)

        const vendorJs = path.join(ctx.extensionPath, 'assets', 'api-console', 'vendor.js')
        const apicJs = path.join(ctx.extensionPath, 'assets', 'api-console', 'apic-build.js')
        const vendorJsUri = panel.webview.asWebviewUri(Uri.file(vendorJs))
        const apicBuildJsUri = panel.webview.asWebviewUri(Uri.file(apicJs))

        const nonce = crypto.randomBytes(16).toString('base64')
        panel.webview.html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${panel.webview.cspSource} 'nonce-${nonce}'; style-src ${panel.webview.cspSource} 'unsafe-inline'; connect-src 'self' http: https:;" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
                <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1,user-scalable=yes">
                <title>API Console</title>
            </head>
            <body>
                <script src="${vendorJsUri.toString()}"></script>
                <api-console-app app rearrangeEndpoints allowCustom allowCustomBaseUri proxyEncodeUrl></api-console-app>
                <div id="loader">
                    <div class="lds-dual-ring"></div>
                </div>
                <script type="module" src="${apicBuildJsUri.toString()}"></script>
                <script nonce="${nonce}">
                    (function() {
                        window.addEventListener('message', function (e) {
                            const apic = document.querySelector('api-console-app');
                            if (e.data.reload) {
                                loader.style.display = 'flex';
                            }
                            if (e.data.content) {
                                const loader = document.querySelector('#loader');
                                apic.amf = e.data.content;
                                loader.style.display = 'none';
                            }
                            if (e.data.serverUri) {
                                apic.setAttribute('proxy', e.data.serverUri + "proxy?url=");
                                apic.setAttribute('redirectUri', e.data.serverUri + "oauth-callback");
                            }
                        });

                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            ready: true,
                            origin: window.location.origin
                        }, '*');
                    })();
                </script>
            </body>
        </html>`
    }))

    // Create the language client and start the client.
    client = new MyLanguageClient(
        'apiContractor',
        'API Contractor',
        createServer,
        clientOptions
    )

    apiDocumentController = new ApiDocumentController(documentSelector, client)
    ctx.subscriptions.push(apiDocumentController)

    // Start the client. This will also launch the server
    ctx.subscriptions.push(client.start())

    ctx.subscriptions.push(client.onDidChangeState(e => {
        if (e.newState === State.Running) {
            client.isReady = true
        } else {
            client.isReady = false
        }
    }))

    client.onReady().then(async () => {
        ctx.subscriptions.push(workspace.onDidRenameFiles(async (e) => {
            const autoRenameRefsOpt = workspace.getConfiguration('apiContractor').get('autoRenameRefs')
            switch (autoRenameRefsOpt) {
                case 'never':
                    break
                case 'always':
                default:
                    await autoRenameRefs(client, e)
                    break
            }
        }))

        if (workspace.rootPath) {
            const res = await readMainApiFile(workspace.rootPath)
            if (!res) {
                await checkMainApiFile(workspace.rootPath)
            }

            const configWatcher = workspace.createFileSystemWatcher(new RelativePattern(workspace.rootPath, configFile), false, false, false)
            configWatcher.onDidCreate(async e => {
                const contents = await workspace.fs.readFile(e)
                try {
                    const data = JSON.parse(contents.toString())
                    await apiDocumentController.updateMainFile(data.main)
                } catch (e: any) {
                    await apiDocumentController.updateMainFile(undefined)
                }
            })
            configWatcher.onDidChange(async e => {
                const contents = await workspace.fs.readFile(e)
                try {
                    const data = JSON.parse(contents.toString())
                    await apiDocumentController.updateMainFile(data.main)
                } catch (e: any) {
                    await apiDocumentController.updateMainFile(undefined)
                }
            })
            configWatcher.onDidDelete(async () => {
                await apiDocumentController.updateMainFile(undefined)
            })
            ctx.subscriptions.push(configWatcher)
        }
    })

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
                const address = server.address()
                if (!address) {
                    throw Error
                }
                const port = typeof address === 'object' ? address.port : 0
                console.log(`[ALS] Spawning at port: ${port}`)
                const args = ['--port', port.toString()]
                if (jvmPath) {
                    const jvmConfig = <string[]>workspace.getConfiguration('apiContractor').get('jvm.arguments')
                    process = child_process.spawn("java", [...jvmConfig, '-jar', jvmPath, ...args])
                    if (!process.stdout || !process.stderr) {
                        return
                    }
                    // See https://github.com/aml-org/als/issues/504
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    process.stdout.on('data', () => { })
                    process.stderr.on('data', (data) => { console.log(`[ALS] ${data.toString()}`) })
                    return
                }
                const jsPath = ctx.asAbsolutePath(path.join('assets', 'server.js'))
                process = child_process.fork(jsPath, args)
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