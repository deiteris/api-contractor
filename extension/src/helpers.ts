import * as child_process from "child_process"
import { window } from "vscode"

export function checkJava(): Promise<boolean> {
    return new Promise((resolve) => {
        const java = child_process.spawn('java', ['-version'])
        let buffer = Buffer.alloc(0)
        java.stderr.on('data', (data) => {
            buffer = Buffer.concat([buffer, data])
        })
        java.stderr.on('end', () => {
            java.kill()
            const data = buffer.toString()
            const javaVersion = new RegExp('(java|openjdk) version').test(data) ? data.split(' ')[2].replace(/"/g, '') : ''
            if (javaVersion) {
                const [major, minor,] = javaVersion.split('.')
                if (parseInt(major) === 1 && parseInt(minor) < 8) {
                    window.showErrorMessage('Java 1.8+ or OpenJDK 8+ is required to run the language server.')
                    return resolve(false)
                }
            } else {
                window.showErrorMessage('Java was not detected. Please download and install Java 1.8+ or OpenJDK 8+.')
                return resolve(false)
            }
            return resolve(true)
        })
    })
}

export function checkJarFile(path: string): Promise<boolean> {
    return new Promise((resolve) => {
        const java = child_process.spawn('java', ['-jar', path])
        let buffer = Buffer.alloc(0)
        java.stderr.on('data', (data) => {
            buffer = Buffer.concat([buffer, data])
        })
        java.stderr.on('end', () => {
            java.kill()
            const data = buffer.toString()
            // TODO: .startsWith() doesn't work for some reason
            if (data.slice(0, 'java.net.ConnectException'.length) === 'java.net.ConnectException') {
                return resolve(true)
            }
            window.showErrorMessage(`An error occurred when loading the jar file: ${data}`)
            return resolve(false)
        })
    })
}