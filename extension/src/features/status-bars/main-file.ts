import { workspace, window, StatusBarItem, StatusBarAlignment, Disposable, DocumentFilter } from 'vscode'

export class MainFileStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []
    private documentFilter: DocumentFilter[]

    constructor(command: string, tooltip: string, documentFilter: DocumentFilter[]) {
        super(() => {this.dispose()})
        this.documentFilter = documentFilter
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 1)
        this.statusBarItem.command = command
        this.statusBarItem.tooltip = tooltip

        this.disposables.push(this.statusBarItem)
        this.registerEvents()
    }

    updateText(text: string) {
        this.statusBarItem.text = text
    }

    show() {
        this.statusBarItem.show()
    }

    hide() {
        this.statusBarItem.hide()
    }

    private registerEvents() {
        this.disposables.push(workspace.onDidCloseTextDocument(async () => {
            const document = window.activeTextEditor?.document
            if (!document || !this.documentFilter.some(filter => filter.language === document.languageId)) {
                this.statusBarItem.hide()
            }
        }))
        this.disposables.push(workspace.onDidOpenTextDocument(async () => {
            const document = window.activeTextEditor?.document
            if (document && this.documentFilter.some(filter => filter.language === document.languageId)) {
                this.statusBarItem.show()
            }
        }))
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}