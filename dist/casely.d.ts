import { RenameEntry } from "./tools/import-rewriter";
import { CaselyConfig, CaseType } from "./types";
export declare const casely: {
    config(options: Partial<CaselyConfig>): void;
    execute(): Promise<void>;
    buildRenameMap(fullPath: string): {
        fileRenames: RenameEntry[];
        folderRenames: RenameEntry[];
        folderFileRenames: RenameEntry[];
    };
    applyRename(oldPath: string, newPath: string, dryRun: boolean): void;
    rename(fullPath: string, name: string, ext: string, currentCase: CaseType): void;
    transform(str: string, target: CaseType): string;
};
