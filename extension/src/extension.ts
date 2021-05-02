// TODO: https://docs.42crunch.com/latest/content/concepts/api_contract_security_audit.htm
// TODO: Show if the opened file is linked if main API file is set

import * as net from 'net'
import * as child_process from "child_process"
import * as url from 'url'
import * as path from 'path'
import * as fs from 'fs-extra'
import { workspace, ExtensionContext, Uri, commands, window, ViewColumn, OpenDialogOptions, WorkspaceEdit, FileRenameEvent, Position, Range } from 'vscode'
import { ApiFormat, findApiFiles } from './features/api-search'
import { LanguageClient, StreamInfo, LanguageClientOptions, CloseAction, ErrorAction } from 'vscode-languageclient/node'
import { checkJava } from './helpers'
import { SerializationPayload, RequestMethod, RenameFilePayload, SerializationResponse, RenameFileResponse, ConversionResponse, ConversionPayload, ConversionFormats, ConversionSyntaxes } from './server-types'
import { Socket } from 'node:net'
import { ChildProcessWithoutNullStreams } from 'node:child_process'
import { ApiDocumentController } from './features/api-document-controller'

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
let socket: Socket
let process: ChildProcessWithoutNullStreams
let apiDocumentController: ApiDocumentController

async function openMainApiSelection(workspaceRoot: string): Promise<boolean> {
    const options: OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'API files': SUPPORTED_EXTENSIONS.map(ext => {return ext.slice(1)}),
            'All files': ['*']
        },
        defaultUri: Uri.file(workspaceRoot)
    }

    const fileUri = await window.showOpenDialog(options)
    if (fileUri && fileUri[0]) {
        await writeMainApiFile(workspaceRoot, fileUri[0].fsPath)
        return true
    }
    return false
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

async function checkMainApiFile(workspaceRoot: string) {
    const candidates = await findApiFiles(workspaceRoot)
    if (!candidates.length) {
        return
    }
    const autoDetectRootApi = workspace.getConfiguration('apiContractor').get('autoDetectRootApi')
    if (autoDetectRootApi) {
        if (candidates.length > 1) {
            const selection = await window.showInformationMessage('There are multiple root API files in the workspace root. Please select a root API file manually.', 'Select file')
            if (selection) {
                await openMainApiSelection(workspaceRoot)
            }
            return
        }
        const rootFile = candidates[0]
        await writeMainApiFile(workspaceRoot, rootFile)
        window.showInformationMessage(`The "${rootFile}" has been automatically selected as a root API file.`)
        return
    }
    const notifyNoMainApiFile = workspace.getConfiguration('apiContractor').get('notification.noMainApiFileSet')
    if (notifyNoMainApiFile) {
        const selection = await window.showInformationMessage('The root API file is not set for this workspace. Would you like to set the root API file?', 'Select file')
        if (selection) {
            await openMainApiSelection(workspaceRoot)
        }
    }
}

async function readMainApiFile(workspaceRoot: string | undefined) {
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
        await checkMainApiFile(workspaceRoot)
    }
}

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
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return
        }
        const res = await openMainApiSelection(workspaceRoot)
        if (res) {
            commands.executeCommand(ExtensionCommands.RestartLanguageServer)
        }
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.SetCurrentAsMainApiFile, async (textEditor) => {
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return
        }
        const document = textEditor.document
        await writeMainApiFile(workspaceRoot, document.fileName)
        commands.executeCommand(ExtensionCommands.RestartLanguageServer)
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.Convert, async (textEditor) => {
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
        client.diagnostics?.clear()
        socket.emit('close')
        process.kill()
    }))

    ctx.subscriptions.push(commands.registerTextEditorCommand(ExtensionCommands.PreviewApiFile, async (textEditor) => {
        const document = textEditor.document
        const uri = client.code2ProtocolConverter.asUri(document.uri)
        const payload: SerializationPayload = { documentIdentifier: { uri } }
        const data: SerializationResponse = await client.sendRequest(RequestMethod.Serialization, payload)
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

        let contents = await fs.readFile(ctx.asAbsolutePath(path.join('assets', 'api-console', 'index.html')), 'utf8')
        const vendorJsUri = Uri.file(
            path.join(ctx.extensionPath, 'assets', 'api-console', 'vendor.js')
        )
        const apicBuildJsUri = Uri.file(
            path.join(ctx.extensionPath, 'assets', 'api-console', 'apic-build.js')
        )
        contents = contents.replace('./vendor.js', panel.webview.asWebviewUri(vendorJsUri).toString()).replace('./apic-build.js', panel.webview.asWebviewUri(apicBuildJsUri).toString())
        panel.webview.html = contents
        setTimeout(() => panel.webview.postMessage(data.content), 1000) // TODO: Hacky way to wait until the page in the webview is actually loaded to post message
    }))

    // Create the language client and start the client.
    client = new LanguageClient(
        'apiContractor',
        'API Contractor',
        createServer,
        clientOptions
    )

    // Start the client. This will also launch the server
    ctx.subscriptions.push(client.start())

    apiDocumentController = new ApiDocumentController(documentSelector)
    ctx.subscriptions.push(apiDocumentController)

    client.onReady().then(async () => {

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
                    // If API file auto detection is enabled, the file may appear before the file watcher notices the deletion
                    // Debounce config file creation to prevent this race condition
                    setTimeout(async () => {
                        await readMainApiFile(workspace.rootPath)
                        commands.executeCommand(ExtensionCommands.RestartLanguageServer)
                    }, 500)
                }
            }

            await revalidate()
        }))

        await readMainApiFile(workspace.rootPath)
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

            server.listen(() => {
                const jarPath = ctx.asAbsolutePath(path.join('assets', 'als-server-assembly.jar'))

                const address = server.address()
                if (!address) {
                    throw Error
                }
                const port = typeof address === 'object' ? address.port : 0

                const options = {
                    cwd: workspace.rootPath,
                }

                const args = [
                    '-jar',
                    jarPath,
                    '--port',
                    port.toString()
                ]
                console.log(`[ALS] Spawning at port: ${port}`)
                process = child_process.spawn("java", args, options)

                // See https://github.com/aml-org/als/issues/504
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                process.stdout.on('data', () => { })
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