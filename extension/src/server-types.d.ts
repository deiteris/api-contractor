import { Diagnostic, DocumentUri, Range, TextDocumentIdentifier, WorkspaceEdit } from "vscode-languageserver-types"

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

export interface FileUsagePayload {
    uri: DocumentUri
}

export interface CleanDiagnosticTreePayload {
    textDocument: TextDocumentIdentifier
}

export const enum ConversionFormats {
    OAS20 = 'OAS 2.0',
    OAS30 = 'OAS 3.0',
    RAML08 = 'RAML 0.8',
    RAML10 = 'RAML 1.0',
    ASYNC20 = 'ASYNC 2.0',
    AMF = 'AMF Graph'
}

export const enum ConversionSyntaxes {
    JSON = 'json',
    YAML = 'yaml',
    RAML = 'raml'
}

export interface SerializationResponse {
    uri: DocumentUri,
    model: Array<Record<string, any>>
}

export interface RenameFileResponse {
    edits: WorkspaceEdit
}

export interface ConversionResponse {
    uri: DocumentUri,
    model?: string, // JVM
    document?: string // JS
}

export interface FileUsageResponse {
    uri: DocumentUri,
    range: Range
}

export interface CleanDiagnosticTreeResponse {
    uri: DocumentUri,
    diagnostics: Diagnostic[],
    profile: string
}

export const enum RequestMethod {
    Serialization = 'serialization',
    RenameFile = 'renameFile',
    Conversion = 'conversion',
    FileUsage = 'fileUsage',
    CleanDiagnosticTree = 'cleanDiagnosticTree'
}