import * as path from 'path'
import { Disposable, DocumentFilter, languages, TextDocument, window, workspace } from "vscode"
import { ExtensionCommands, SUPPORTED_EXTENSIONS } from "../extension"
import { ApiFormat, readApiType } from "./api-search"
import { FileFormatStatusBar } from "./status-bars/file-format"
import { MainFileStatusBar } from "./status-bars/main-file"

export class ApiDocumentController extends Disposable {
    private fileFormatStatusBar: FileFormatStatusBar
    private mainFileStatusBar: MainFileStatusBar
    private documentFilter: DocumentFilter[]
    private disposables: Disposable[] = []
    private extensions: string[]
    public filename: string | undefined

    constructor(documentFilter: DocumentFilter[]) {
        super(() => { this.dispose() })
        this.documentFilter = documentFilter
        this.fileFormatStatusBar = new FileFormatStatusBar(ExtensionCommands.Convert, 'API format of the current file. Click to convert to different format.')
        this.disposables.push(this.fileFormatStatusBar)
        this.mainFileStatusBar = new MainFileStatusBar(ExtensionCommands.SetMainApiFile, 'Current root API file. Click to select root API file.')
        this.disposables.push(this.mainFileStatusBar)
        this.extensions = SUPPORTED_EXTENSIONS

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

    updateFilename(filename: string | undefined) {
        this.filename = filename
        this.mainFileStatusBar.updateText(this.filename)
    }

    private async changeDocumentLanguage(document: TextDocument, apiFormat: ApiFormat | undefined): Promise<TextDocument> {
        if (!apiFormat) {
            let ext = path.extname(document.fileName)
            if (ext === '.yml') {
                ext = '.yaml'
            }
            if (['json-api', 'yaml-api', 'raml'].includes(document.languageId)) {
                return languages.setTextDocumentLanguage(document, ext.slice(1))
            }
            return document
        }
        return languages.setTextDocumentLanguage(document, `${apiFormat.languageId}`)
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
            if (document && this.extensions.includes(path.extname(document.fileName))) {
                await this.handleApiDocument(document)
                return
            }
            this.mainFileStatusBar.hide()
            this.fileFormatStatusBar.hide()
        }))
        this.disposables.push(workspace.onDidSaveTextDocument(async (document) => {
            const activeDocument = window.activeTextEditor?.document
            if (activeDocument && this.extensions.includes(path.extname(activeDocument.fileName)) && activeDocument.fileName === document.fileName) {
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