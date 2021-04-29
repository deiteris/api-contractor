import { window, StatusBarItem, StatusBarAlignment, Disposable, DocumentFilter, TextDocument } from 'vscode'

export class MainFileStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []
    private documentFilter: DocumentFilter[]

    constructor(command: string, tooltip: string, documentFilter: DocumentFilter[]) {
        super(() => { this.dispose() })
        this.documentFilter = documentFilter
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 1)
        this.statusBarItem.command = command
        this.statusBarItem.tooltip = tooltip

        this.disposables.push(this.statusBarItem)
        this.toggle(window.activeTextEditor?.document)
        this.registerEvents()
    }

    updateText(text: string) {
        this.statusBarItem.text = text
    }

    toggle(document: TextDocument | undefined) {
        if (document && this.documentFilter.some(filter => filter.language === document.languageId)) {
            this.statusBarItem.show()
            return
        }
        this.statusBarItem.hide()
    }

    private registerEvents() {
        this.disposables.push(window.onDidChangeActiveTextEditor(async (editor) => {
            this.toggle(editor?.document)
        }))
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}