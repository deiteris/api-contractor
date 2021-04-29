import { workspace, commands, window, StatusBarItem, StatusBarAlignment, Disposable, TextDocument } from 'vscode'
import { readApiFileFormat } from '../../helpers'

export class FileFormatStatusBar extends Disposable {
    private statusBarItem: StatusBarItem
    private disposables: Disposable[] = []

    constructor(command: string, tooltip: string) {
        super(() => { this.dispose() })
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 2)
        this.statusBarItem.tooltip = tooltip
        this.statusBarItem.command = command

        this.disposables.push(this.statusBarItem)
        this.changeApiFormat(window.activeTextEditor?.document)
        this.registerEvents()
    }

    updateText(text: string) {
        this.statusBarItem.text = text
    }

    // TODO: FileFormatStatusBar controls the context on which preview buttons depends. This is not what normally should be expected...
    async changeApiFormat(document: TextDocument | undefined) {
        const apiFormat = await readApiFileFormat(document)
        if (apiFormat) {
            commands.executeCommand('setContext', 'ac.isApiFile', true)
            this.updateText(`${apiFormat.type}`)
            this.show()
            return
        }
        commands.executeCommand('setContext', 'ac.isApiFile', false)
        this.hide()
    }

    show() {
        this.statusBarItem.show()
    }

    hide() {
        this.statusBarItem.hide()
    }

    private registerEvents() {
        this.disposables.push(window.onDidChangeActiveTextEditor(async (editor) => {
            await this.changeApiFormat(editor?.document)
        }))
        this.disposables.push(workspace.onDidSaveTextDocument(async () => {
            await this.changeApiFormat(window.activeTextEditor?.document)
        }))
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}