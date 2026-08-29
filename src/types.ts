export type CaseType = "camel" | "kebab" | "pascal" | "unknown";
export type OperationMode = "partial" | "full";

export interface CaselyConfig {
  path: string;
  file: string[]; // e.g. ["js", "ts"]
  case: CaseType;
  operate: OperationMode;
  dryRun?: boolean;
  rewriteImports?: boolean;
}
