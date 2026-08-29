export interface RenameEntry {
    oldPath: string;
    newPath: string;
}
export declare function rewriteImports(targetDir: string, renameMap: RenameEntry[], extensions: string[], dryRun: boolean): void;
