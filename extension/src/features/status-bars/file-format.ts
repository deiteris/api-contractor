import { window, StatusBarItem, StatusBarAlignment, Disposable } from 'vscode'

export class FileFormatStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []

    constructor(command: string, tooltip: string) {
        super(() => { this.dispose() })
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 2)
        this.statusBarItem.tooltip = tooltip
        this.statusBarItem.command = command

        this.disposables.push(this.statusBarItem)
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

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}