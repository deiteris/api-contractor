import { TextDocumentIdentifier, WorkspaceEdit } from "vscode-languageserver-types"

export interface SerializationPayload {
    documentIdentifier: TextDocumentIdentifier
}

export interface RenameFilePayload {
    oldDocument: TextDocumentIdentifier,
    newDocument: TextDocumentIdentifier
}

export interface SerializationResponse {
    content: string
}

export interface RenameFileResponse {
    edits: WorkspaceEdit
}

export const enum RequestType {
    Serialization = 'serialization',
    RenameFile = 'renameFile'
}