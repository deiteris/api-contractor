import { DocumentUri, TextDocumentIdentifier, WorkspaceEdit } from "vscode-languageserver-types"

export interface SerializationPayload {
    documentIdentifier: TextDocumentIdentifier
}

export interface RenameFilePayload {
    oldDocument: TextDocumentIdentifier,
    newDocument: TextDocumentIdentifier
}

export interface ConversionPayload {
    uri: DocumentUri,
    target: ConversionFormats,
    syntax?: ConversionSyntaxes
}

export const enum ConversionFormats {
    OAS20 = 'OAS 2.0',
    OAS30 = 'OAS 3.0',
    RAML08 = 'RAML 0.8',
    RAML10 = 'RAML 1.0',
    ASYNC20 = 'ASYNC 2.0'
}

export const enum ConversionSyntaxes {
    JSON = 'json',
    YAML = 'yaml',
    RAML = 'raml'
}

export interface SerializationResponse {
    content: string
}

export interface RenameFileResponse {
    edits: WorkspaceEdit
}

export interface ConversionResponse {
    uri: DocumentUri,
    content: string
}

export const enum RequestMethod {
    Serialization = 'serialization',
    RenameFile = 'renameFile',
    Conversion = 'conversion'
}