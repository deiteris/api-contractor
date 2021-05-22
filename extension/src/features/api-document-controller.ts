import * as path from 'path'
import * as fs from 'fs-extra'
import { commands, Disposable, DocumentFilter, FileSystemWatcher, languages, RelativePattern, StatusBarAlignment, TextDocument, window, workspace } from "vscode"
import { DocumentUri } from 'vscode-languageclient/node'
import { ExtensionCommands, SUPPORTED_EXTENSIONS, configFile } from "../extension"
import { ApiFormat, readApiType } from "./api-search"
import { FileFormatStatusBar, MainFileStatusBar } from './status-bar'

export class ApiDocumentController extends Disposable {
    private fileFormatStatusBar: FileFormatStatusBar
    private mainFileStatusBar: MainFileStatusBar
    private documentFilter: DocumentFilter[]
    private disposables: Disposable[] = []
    // TODO: Ugly way to workaround client request. Needs refactor.
    private getFileUsage: (document: TextDocument) => Promise<DocumentUri[]>
    private mainFileWatcher: FileSystemWatcher | undefined
    public mainFile: string | undefined
    public fileUsage: DocumentUri[] = []

    constructor(documentFilter: DocumentFilter[], getFileUsage: (document: TextDocument) => Promise<DocumentUri[]>) {
        super(() => { this.dispose() })
        this.documentFilter = documentFilter
        this.fileFormatStatusBar = new FileFormatStatusBar(window.createStatusBarItem(StatusBarAlignment.Right, 2), ExtensionCommands.Convert, 'API format of the current file. Click to convert to different format.')
        this.disposables.push(this.fileFormatStatusBar)
        this.mainFileStatusBar = new MainFileStatusBar(window.createStatusBarItem(StatusBarAlignment.Right, 1), ExtensionCommands.SetMainApiFile, 'Current root API file. Click to select root API file.')
        this.disposables.push(this.mainFileStatusBar)
        this.getFileUsage = getFileUsage

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

    updateMainFile(filename: string | undefined) {
        if (this.mainFileWatcher) {
            this.mainFileWatcher.dispose()
        }
        if (filename) {
            this.mainFileWatcher = workspace.createFileSystemWatcher(new RelativePattern(workspace.rootPath!, filename), true, true, false)
            this.mainFileWatcher.onDidDelete(async () => {
                const configPath = path.join(workspace.rootPath!, configFile)
                await fs.remove(configPath)
            })
        }
        this.mainFile = filename
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