export type CaseType = "camel" | "kebab" | "pascal" | "unknown";
export type OperationMode = "partial" | "full";
export interface CaselyConfig {
    path: string;
    file: string[];
    case: CaseType;
    operate: OperationMode;
    dryRun?: boolean;
    rewriteImports?: boolean;
}
