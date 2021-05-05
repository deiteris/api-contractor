import { StatusBarItem, Disposable } from 'vscode'

class StatusBar extends Disposable {
    protected statusBarItem: StatusBarItem
    protected disposables: Disposable[] = []

    constructor(statusBarItem: StatusBarItem, command: string, tooltip: string) {
        super(() => { this.dispose() })
        this.statusBarItem = statusBarItem
        this.statusBarItem.tooltip = tooltip
        this.statusBarItem.command = command

        this.disposables.push(this.statusBarItem)
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

export class MainFileStatusBar extends StatusBar {
    updateText(filename: string | undefined) {
        this.statusBarItem.text = `$(file-code) ${filename ? filename : 'No root API file'}`
    }
}

export class FileFormatStatusBar extends StatusBar {
    updateText(text: string) {
        this.statusBarItem.text = text
    }
}