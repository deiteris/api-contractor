import { workspace, commands, window, StatusBarItem, StatusBarAlignment, Disposable } from 'vscode'
import { readApiFileFormat } from '../../helpers'

export class FileFormatStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []

    constructor(tooltip: string) {
        super(() => {this.dispose()})
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 2)
        this.statusBarItem.tooltip = tooltip

        this.disposables.push(this.statusBarItem)
        this.registerEvents()
    }

    updateText(text: string) {
        this.statusBarItem.text = text
    }

    // TODO: FileFormatStatusBar controls the context on which preview buttons depends. This is not what normally should be expected...
    async changeApiFormat() {
        const apiFormat = await readApiFileFormat()
        if (apiFormat) {
            commands.executeCommand('setContext', 'ac.isApiFile', true)
            this.updateText(`${apiFormat.type}`)
            this.show()
        } else {
            commands.executeCommand('setContext', 'ac.isApiFile', false)
            this.hide()
        }
    }

    show() {
        this.statusBarItem.show()
    }

    hide() {
        this.statusBarItem.hide()
    }

    private registerEvents() {
        this.disposables.push(workspace.onDidCloseTextDocument(async () => {
            await this.changeApiFormat()
        }))

        this.disposables.push(workspace.onDidOpenTextDocument(async () => {
            await this.changeApiFormat()
        }))

        this.disposables.push(workspace.onDidSaveTextDocument(async () => {
            await this.changeApiFormat()
        }))
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}