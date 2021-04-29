import * as fs from 'fs-extra'
import * as path from 'path'

interface FileInfo {
    absolute: string,
    relative: string
}

export interface ApiFormat {
    type: string,
    syntax: string
}

/**
 * Finds API files and returns the list of file paths relative to given location.
 */
export async function findApiFiles(workdir: string): Promise<Array<string> | undefined> {
    const items = await fs.readdir(workdir)
    const exts = ['.raml', '.yaml', '.json']
    const ignore = ['exchange.json', 'art_config.yaml', 'art.yaml']
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
        return _decideMainFile(files, workdir)
    }
    return undefined
}

/**
 * Decides which file to use as main API file.
 */
async function _decideMainFile(files: string[], workdir: string): Promise<string[] | undefined> {
    const fullPathFiles = files.map((item) => {
        return {
            absolute: path.join(workdir, item),
            relative: item
        }
    })
    const list = await _findWebApiFiles(fullPathFiles)
    if (!list) {
        return undefined
    }
    return list
}

/**
 * Reads all files and looks for RAML and OpenAPI (Swagger) API headers
 */
async function _findWebApiFiles(files: FileInfo[]): Promise<string[]> {
    const results: string[] = []
    for (const file of files) {
        const type = await readApiType(file.absolute)
        if (type) {
            results.push(file.relative)
        }
    }
    return results
}

/**
 * Reads API type from the API file.
 */
export async function readApiType(file: string): Promise<ApiFormat | undefined> {
    const size = 50
    // todo (pawel): This works 100% for RAML files as they have to have a
    // type and version in the file header. However JSON OAS can have version
    // definition anywhere in the JSON object. It works for lot of APIs
    // but it may be broken for some APIs.
    // It should read and parse JSON files and look for the version value.
    // Leaving it here for performance reasons.
    const fd = await fs.open(file, 'r')
    const result = await fs.read(fd, Buffer.alloc(size), 0, size, 0)
    await fs.close(fd)
    const data = result.buffer.toString().trim()
    if (data[0] === '{') {
        // OAS 2/3
        const match = data.match(/"(?:openapi|swagger)"(?:\s*)?:(?:\s*)"(\d\.\d).*"/im)
        if (!match) {
            return undefined
        }
        const v = match[1].trim()
        return {
            type: `OAS ${v}`,
            syntax: 'json'
        }
    }
    const oasMatch = data.match(/(?:openapi|swagger)[^\s*]?:(?:\s*)("|')?(\d\.\d)("|')?/im)
    if (oasMatch) {
        const v = oasMatch[2].trim()
        return {
            type: `OAS ${v}`,
            syntax: 'yaml'
        }
    }
    const header = data.split('\n')[0].substr(2).trim()
    if (!header || header.indexOf('RAML ') !== 0) {
        return undefined
    }
    if (header === 'RAML 0.8') {
        return {
            type: header,
            syntax: 'raml'
        }
    }
    if (header.indexOf('RAML 1.0') === 0) {
        return {
            type: 'RAML 1.0',
            syntax: 'raml'
        }
    }
    return undefined
}