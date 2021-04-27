import * as fs from 'fs-extra'
import * as path from 'path'

interface FileInfo {
    absolute: string,
    relative: string
}

export interface ApiFormat {
    type: string,
    contentType: string
}

/**
 * Searches for API main file in given location
 */
export class ApiSearch {
    private _workingDir: string
    /**
     * @param {String} dir API directory location
     */
    constructor(dir: string) {
        this._workingDir = dir
    }
    /**
     * Finds main API name.
     *
     * If one of the files is one of the popular names for the API spec files
     * then it always returns this file.
     *
     * If it finds single candidate it returns it as a main file.
     *
     * If it finds more than a single file it means that the user has to decide
     * which one is the main file.
     *
     * If it returns undefined than the process failed and API main file cannot
     * be determined.
     *
     */
    async findApiFile(): Promise<Array<string> | undefined> {
        const items = await fs.readdir(this._workingDir)
        const exts = ['.raml', '.yaml', '.json']
        const ignore = ['__macosx', 'exchange.json', '.ds_store', 'art_config.yaml', 'art.yaml']
        const files: string[] = []
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const lower = item.toLowerCase()
            if (ignore.indexOf(lower) !== -1) {
                continue
            }
            const ext = path.extname(lower)
            if (exts.indexOf(ext) !== -1) {
                files.push(item)
            }
        }
        if (files.length) {
            return this._decideMainFile(files)
        }
        return undefined
    }

    /**
     * Decides which file to use as API main file.
     */
    async _decideMainFile(files: string[]): Promise<string[] | undefined> {
        const root = this._workingDir
        const fullPathFiles = files.map((item) => {
            return {
                absolute: path.join(root, item),
                relative: item
            }
        })
        const list = await this._findWebApiFile(fullPathFiles)
        if (!list) {
            return undefined
        }
        return list
    }
    /**
     * Reads all files and looks for RAML and OpenAPI (Swagger) API headers
     */
    async _findWebApiFile(files: FileInfo[]): Promise<string[]> {
        const results: string[] = []
        for (const file of files) {
            const type = await this._readApiType(file.absolute)
            if (type) {
                results.push(file.relative)
            }
        }
        return results
    }
    /**
     * Reads API type from the API main file.
     */
    async _readApiType(file: string): Promise<ApiFormat | undefined> {
        const size = 50
        // todo (pawel): This works 100% for RAML files as they have to have a
        // type and version in the file header. However JSON OAS can have version
        // definition anythere in the JSON object. It works for lot of APIs
        // but it may be broken for some APIs.
        // It should read and parse JSON files and look for the version value.
        // Leaving it here for performance reasons.
        const fd = await fs.open(file, 'r')
        const result = await fs.read(fd, Buffer.alloc(size), 0, size, 0)
        await fs.close(fd)
        const data = result.buffer.toString().trim()
        if (data[0] === '{') {
            // OAS 1/2
            const match = data.match(/"swagger"(?:\s*)?:(?:\s*)"(.*)"/im)
            if (!match) {
                return undefined
            }
            const v = match[1].trim()
            return {
                type: `OAS ${v}`,
                contentType: 'application/json'
            }
        }
        const oasMatch = data.match(/(?:openapi|swagger)[^\s*]?:(?:\s*)("|')?(\d\.\d)("|')?/im)
        if (oasMatch) {
            const v = oasMatch[2].trim()
            return {
                type: `OAS ${v}`,
                contentType: 'application/yaml'
            }
        }
        const header = data.split('\n')[0].substr(2).trim()
        if (!header || header.indexOf('RAML ') !== 0) {
            return undefined
        }
        if (header === 'RAML 0.8') {
            return {
                type: header,
                contentType: 'application/raml'
            }
        }
        if (header.indexOf('RAML 1.0') === 0) {
            return {
                type: 'RAML 1.0',
                contentType: 'application/raml'
            }
        }
        return undefined
    }
}