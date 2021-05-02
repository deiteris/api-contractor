import { window, StatusBarItem, StatusBarAlignment, Disposable } from 'vscode'

export class MainFileStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []

    constructor(command: string, tooltip: string) {
        super(() => { this.dispose() })
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 1)
        this.statusBarItem.tooltip = tooltip
        this.statusBarItem.command = command

        this.disposables.push(this.statusBarItem)
    }

    updateText(filename: string | undefined) {
        this.statusBarItem.text = `$(file-code) ${filename ? filename : 'No root API file'}`
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