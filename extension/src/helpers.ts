import * as child_process from "child_process"
import { window, workspace } from "vscode"
import { ApiSearch, ApiFormat } from "./features/api-search"

export async function readApiFileFormat(document = window.activeTextEditor?.document): Promise<ApiFormat | undefined> {
    if (document && document.uri.scheme === 'file') {
        const workspaceRoot = workspace.rootPath
        if (!workspaceRoot) {
            return undefined
        }
        const apiSearch = new ApiSearch(workspaceRoot)
        return await apiSearch._readApiType(document.uri.fsPath)
    }
    return undefined
}

export function checkJava(): Promise<boolean> {
    return new Promise((resolve) => {
        const java = child_process.spawn('java', ['-version'])
        let buffer = Buffer.alloc(0)
        java.stderr.on('data', (data) => {
            buffer = Buffer.concat([buffer, data])
        })
        java.stderr.on('end', () => {
            const data = buffer.toString()
            const javaVersion = new RegExp('(java|openjdk) version').test(data) ? data.split(' ')[2].replace(/"/g, '') : ''
            if (javaVersion) {
                const [major, minor,] = javaVersion.split('.')
                if (parseInt(major) === 1 && parseInt(minor) < 8) {
                    window.showErrorMessage('Java 1.8+ or OpenJDK 8+ is required to run the language server.')
                    throw Error
                }
            } else {
                window.showErrorMessage('Java was not detected. Please download and install Java 1.8+ or OpenJDK 8+.')
                throw Error
            }
            resolve(true)
        })
    })
}