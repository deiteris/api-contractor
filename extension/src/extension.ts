// TODO: https://docs.42crunch.com/latest/content/concepts/api_contract_security_audit.htm
// TODO: Investigate conversion feature
// TODO: Show if the opened file is linked if main API file is set

import * as net from 'net'
import * as child_process from "child_process"
import * as url from 'url'
import * as path from 'path'
import * as fs from 'fs-extra'
import { workspace, ExtensionContext, Uri, commands, window, ViewColumn, OpenDialogOptions, WorkspaceEdit, FileRenameEvent, Position, Range } from 'vscode'
import { ApiSearch } from './features/api-search'
import { MainFileStatusBar } from './features/status-bars/main-file'
import { FileFormatStatusBar } from './features/status-bars/file-format'
import { LanguageClient, StreamInfo, LanguageClientOptions } from 'vscode-languageclient/node'
import { checkJava, readApiFileFormat } from './helpers'
import { SerializationPayload, RequestType, RenameFilePayload, SerializationResponse, RenameFileResponse } from './server-types'

const enum ExtensionCommands {
    RestartLanguageServer = 'ac.management.restart',
    PreviewApiFile = 'ac.management.preview',
    SetMainApiFile = 'ac.set.mainFile'
}
const configFile = 'exchange.json' // TODO: May change soon: https://github.com/aml-org/als/issues/508#issuecomment-820033766

let client: LanguageClient
let fileFormatStatusBar: FileFormatStatusBar
let mainFileStatusBar: MainFileStatusBar

function openMainApiSelection(workspaceRoot: string) {
    const options: OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'API files': ['raml', 'yaml', 'yml', 'json'],
            'All files': ['*']
        }
    }

    window.showOpenDialog(options).then(fileUri => {
        if (fileUri && fileUri[0]) {
            writeMainApiFile(workspaceRoot, fileUri[0].fsPath)
        }
    })
}

function writeMainApiFile(workspaceRoot: string, filePath: string) {
    let main = filePath
    if (path.isAbsolute(filePath)) {
        main = path.relative(workspaceRoot, filePath).replace(/\\/g, '/')
        if (main.startsWith('../')) {
            window.showErrorMessage('The root API file cannot be outside the current workspace root.')
            return
        }
    }
    const configPath = path.join(workspaceRoot, configFile)
    fs.writeJSON(configPath, { main }).then(() => {
        commands.executeCommand(ExtensionCommands.RestartLanguageServer)
    })
    mainFileStatusBar.updateText(`$(file-code) ${main}`)
}

async function autoRenameRefs(client: LanguageClient, e: FileRenameEvent) {
    for (const file of e.files) {
        const payload: RenameFilePayload = {
            oldDocument: { uri: client.code2ProtocolConverter.asUri(file.oldUri) },
            newDocument: { uri: client.code2ProtocolConverter.asUri(file.newUri) }
        }
        const data: RenameFileResponse = await client.sendRequest(RequestType.RenameFile, payload)
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
        workspace.applyEdit(we).then(res => {
            if (res) {
                workspace.saveAll(false)
            }
        })
    }
}

async function checkMainApiFile(workspaceRoot: string) {
    const autoDetectRootApi = workspace.getConfiguration('apiContractor').get('autoDetectRootApi')
    if (autoDetectRootApi) {
        const apiSearch = new ApiSearch(workspaceRoot)
        const candidates = await apiSearch.findApiFile()
        if (!candidates) {
            return
        }
        if (candidates.length > 1) {
            window.showInformationMessage('There are multiple root API files in the workspace root. Please select a root API file manually.', 'Select file').then((selection) => {
                if (selection) {
                    openMainApiSelection(workspaceRoot)
                }
            })
            return
        }
        const rootFile = candidates[0]
        writeMainApiFile(workspaceRoot, rootFile)
        window.showInformationMessage(`The "${rootFile}" has been automatically selected as a root API file.`)
        return
    }
    window.showInformationMessage('Main API file is not set for this workspace. Would you like to set the root API file?', 'Select file').then((selection) => {
        if (selection) {
            openMainApiSelection(workspaceRoot)
        }
    })
}

async function readMainApiFile(workspaceRoot: string | undefined) {
    if (!workspaceRoot) {
        return
    }
    try {
        const data = await fs.readJSON(path.join(workspaceRoot, configFile))
        mainFileStatusBar.updateText(`$(file-code) ${data.main}`)
    } catch {
        mainFileStatusBar.updateText(`$(file-code) No root API file`)
        await checkMainApiFile(workspaceRoot)
    }
}

export async function activate(ctx: ExtensionContext) {

    const res = await checkJava()
    if (!res) {
        throw Error
    }

    const documentSelector = [
        { scheme: 'file', language: 'raml' },
        { scheme: 'file', language: 'yaml' },
        { scheme: 'file', language: 'json' }
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
        }
    }

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.SetMainApiFile, () => {
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            window.showErrorMessage('Failed to set main API file: no workspace currently opened.')
            return
        }
        openMainApiSelection(workspaceRoot)
    }))

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.RestartLanguageServer, () => {
        client.stop().then(() => {
            client.start()
        })
    }))

    ctx.subscriptions.push(commands.registerCommand(ExtensionCommands.PreviewApiFile, async () => {
        const textEditor = window.activeTextEditor
        if (!textEditor) {
            window.showErrorMessage('Failed to open the preview: no active text editor window.')
            return
        }
        const document = textEditor.document
        if (document.uri.scheme !== 'file') {
            window.showErrorMessage('Failed to open the preview: make sure that you focused a window with the file and the file is saved to a disk.')
            return
        }
        const apiFormat = await readApiFileFormat(document)
        if (!apiFormat) {
            window.showErrorMessage('Failed to open the preview: the file is not an API file or has invalid format.')
            return
        }
        const uri = client.code2ProtocolConverter.asUri(document.uri)
        const payload: SerializationPayload = { documentIdentifier: { uri } }
        const data: SerializationResponse = await client.sendRequest(RequestType.Serialization, payload)
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

        fs.readFile(ctx.asAbsolutePath(path.join('assets', 'api-console', 'index.html')), 'utf8').then(contents => {
            const vendorJsUri = Uri.file(
                path.join(ctx.extensionPath, 'assets', 'api-console', 'vendor.js')
            )
            const apicBuildJsUri = Uri.file(
                path.join(ctx.extensionPath, 'assets', 'api-console', 'apic-build.js')
            )
            contents = contents.replace('./vendor.js', panel.webview.asWebviewUri(vendorJsUri).toString()).replace('./apic-build.js', panel.webview.asWebviewUri(apicBuildJsUri).toString())
            panel.webview.html = contents
            setTimeout(() => panel.webview.postMessage(data.content), 1000) // TODO: Hacky way to wait until the webview actually loads to post message
        })
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

    fileFormatStatusBar = new FileFormatStatusBar('API format of the current file.')
    ctx.subscriptions.push(fileFormatStatusBar)

    mainFileStatusBar = new MainFileStatusBar(ExtensionCommands.SetMainApiFile, 'Select root API file.', documentSelector)
    ctx.subscriptions.push(mainFileStatusBar)

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
                if (path.basename(file.fsPath) === configFile) {
                    // If API file auto detection is enabled, the file may appear before file watcher notices the deletion
                    // Debounce config file creation to prevent this race condition
                    setTimeout(async () => await readMainApiFile(workspace.rootPath), 500)
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
            const contents = await fs.readFile(file.uri.fsPath, 'utf8')
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
            const server = net.createServer(socket => {
                console.log("[ALS] Socket created")

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
                const process = child_process.spawn("java", args, options)

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