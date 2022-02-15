import * as path from 'path'
import * as fs from 'fs-extra'
import { ExecuteCommandRequest } from 'vscode-languageclient'
import { commands, Disposable, DocumentFilter, FileSystemWatcher, languages, ProgressLocation, RelativePattern, StatusBarAlignment, TextDocument, Uri, window, workspace } from "vscode"
import { DocumentUri } from 'vscode-languageclient/node'
import { ExtensionCommands, SUPPORTED_EXTENSIONS, configFile, MyLanguageClient } from "../extension"
import { ApiFormat, readApiType } from "./api-search"
import { FileFormatStatusBar, MainFileStatusBar } from './status-bar'
import { DidChangeConfigurationPayload, FileUsagePayload, FileUsageResponse, RequestMethod } from '../server-types'

export class ApiDocumentController extends Disposable {
    private fileFormatStatusBar: FileFormatStatusBar
    private mainFileStatusBar: MainFileStatusBar
    private documentFilter: DocumentFilter[]
    private disposables: Disposable[] = []
    private mainFileWatcher: FileSystemWatcher | undefined
    private client: MyLanguageClient
    public mainFile: string | undefined
    public fileUsage: DocumentUri[] = []

    constructor(documentFilter: DocumentFilter[], client: MyLanguageClient) {
        super(() => { this.dispose() })
        this.documentFilter = documentFilter
        this.fileFormatStatusBar = new FileFormatStatusBar(window.createStatusBarItem(StatusBarAlignment.Right, 2), ExtensionCommands.Convert, 'API format of the current file. Click to convert to different format.')
        this.disposables.push(this.fileFormatStatusBar)
        this.mainFileStatusBar = new MainFileStatusBar(window.createStatusBarItem(StatusBarAlignment.Right, 1), ExtensionCommands.SetMainApiFile, 'Current root API file. Click to select root API file.')
        this.disposables.push(this.mainFileStatusBar)
        this.client = client

        this.registerEvents()
        this.init()
    }

    private async init() {
        const document = window.activeTextEditor?.document
        if (!document) {
            return
        }
        await this.handleApiDocument(document)
    }

    private async handleApiDocument(document: TextDocument) {
        const apiFormat = await this.readApiFileFormat(document)
        document = await this.changeDocumentLanguage(document, apiFormat)
        this.toggleMainFileStatusBar(document)
        this.changeApiFormat(apiFormat)
    }

    public async updateMainFile(filePath: string | undefined) {
        if (this.mainFileWatcher) {
            this.mainFileWatcher.dispose()
        }
        if (filePath) {
            this.mainFileWatcher = workspace.createFileSystemWatcher(new RelativePattern(workspace.rootPath!, filePath), true, true, false)
            this.mainFileWatcher.onDidDelete(async () => {
                const configPath = path.join(workspace.rootPath!, configFile)
                await fs.remove(configPath)
            })
        }
        if (this.client.isReady) {
            if (filePath) {
                const uri = Uri.file(path.join(workspace.rootPath!, filePath))
                const d: any = await this.client.sendRequest('getWorkspaceConfiguration', {textDocument: { uri: this.client.code2ProtocolConverter.asUri(uri) }})
                await this.client.sendRequest(ExecuteCommandRequest.type, {
                    command: 'didChangeConfiguration',
                    arguments: <DidChangeConfigurationPayload[]>[
                        {
                            ...d.configuration,
                            mainPath: filePath
                        }
                    ]
                })
            } else {
                // TODO: If there will be support for extensions - all dependencies will probably be reset in this case
                await this.client.sendRequest(ExecuteCommandRequest.type, {
                    command: 'didChangeConfiguration',
                    arguments: <DidChangeConfigurationPayload[]>[
                        {
                            folder: this.client.code2ProtocolConverter.asUri(Uri.file(workspace.rootPath!)),
                            mainPath: ''
                        }
                    ]
                })
            }
        }
        this.mainFile = filePath
        this.mainFileStatusBar.updateText(this.mainFile)
    }

    private async changeDocumentLanguage(document: TextDocument, apiFormat: ApiFormat | undefined): Promise<TextDocument> {
        if (!apiFormat) {
            commands.executeCommand('setContext', 'ac.isApiFile', false)
            let ext = path.extname(document.fileName)
            if (ext === '.yml') {
                ext = '.yaml'
            }
            if (this.fileUsage.length && ['.json', '.yaml'].includes(ext)) {
                return languages.setTextDocumentLanguage(document, `${ext.slice(1)}-api`)
            }
            if (['json-api', 'yaml-api', 'raml'].includes(document.languageId)) {
                return languages.setTextDocumentLanguage(document, ext.slice(1))
            }
        } else if (apiFormat.languageId !== document.languageId) {
            commands.executeCommand('setContext', 'ac.isApiFile', true)
            return languages.setTextDocumentLanguage(document, `${apiFormat.languageId}`)
        }
        commands.executeCommand('setContext', 'ac.isApiFile', true)
        return document
    }

    async readApiFileFormat(document: TextDocument): Promise<ApiFormat | undefined> {
        if (document.uri.scheme === 'file') {
            return readApiType(document.fileName)
        }
        return undefined
    }

    private toggleMainFileStatusBar(document: TextDocument) {
        if (this.documentFilter.some(filter => filter.language === document.languageId)) {
            this.mainFileStatusBar.show()
            return
        }
        this.mainFileStatusBar.hide()
    }

    private async changeApiFormat(apiFormat: ApiFormat | undefined) {
        if (apiFormat) {
            this.fileFormatStatusBar.updateText(`${apiFormat.type}`)
            this.fileFormatStatusBar.show()
            return
        }
        this.fileFormatStatusBar.hide()
    }

    private async getFileUsage(document: TextDocument): Promise<DocumentUri[]> {
        if (!this.client.isReady) {
            return []
        }
        const uri = this.client.code2ProtocolConverter.asUri(document.uri)
        const payload: FileUsagePayload = { uri }
        const data: FileUsageResponse[] = await window.withProgress({location: ProgressLocation.Window, cancellable: false, title: 'Checking file usage'}, async () => {
            return this.client.sendRequest(RequestMethod.FileUsage, payload)
        })
        return data.map((location) => { return location.uri })
    }

    private registerEvents() {
        this.disposables.push(window.onDidChangeActiveTextEditor(async (editor) => {
            const document = editor?.document
            if (document) {
                this.fileUsage = await this.getFileUsage(document)
                if (SUPPORTED_EXTENSIONS.includes(path.extname(document.fileName))) {
                    await this.handleApiDocument(document)
                    return
                }
            }
            this.mainFileStatusBar.hide()
            this.fileFormatStatusBar.hide()
        }))
        this.disposables.push(workspace.onDidSaveTextDocument(async (document) => {
            const activeDocument = window.activeTextEditor?.document
            if (activeDocument && SUPPORTED_EXTENSIONS.includes(path.extname(activeDocument.fileName)) && activeDocument.fileName === document.fileName) {
                await this.handleApiDocument(activeDocument)
            }
        }))
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}