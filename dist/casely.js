"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.casely = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const resolver_1 = require("./tools/resolver");
const case_identifier_1 = require("./tools/case-identifier");
const import_rewriter_1 = require("./tools/import-rewriter");
const chalk_1 = __importDefault(require("chalk"));
let defaultConfig = {
    path: process.cwd(),
    file: ["js", "jsx", "ts", "tsx"],
    case: "kebab",
    operate: "partial",
    dryRun: false,
    rewriteImports: true,
};
exports.casely = {
    config(options) {
        defaultConfig = { ...defaultConfig, ...options };
    },
    async execute() {
        const fullPath = path_1.default.resolve(defaultConfig.path);
        if (!fs_1.default.existsSync(fullPath)) {
            console.log(chalk_1.default.red(`\n  Path "${fullPath}" does not exist.\n`));
            return;
        }
        const renameMap = this.buildRenameMap(fullPath);
        if (renameMap.fileRenames.length === 0 && renameMap.folderRenames.length === 0) {
            console.log(chalk_1.default.green("\n  ✔ All names already match the target case.\n"));
            return;
        }
        if (defaultConfig.rewriteImports !== false) {
            const allRenames = [...renameMap.fileRenames, ...renameMap.folderFileRenames];
            (0, import_rewriter_1.rewriteImports)(fullPath, allRenames, defaultConfig.file, defaultConfig.dryRun ?? false);
        }
        for (const entry of renameMap.fileRenames) {
            this.applyRename(entry.oldPath, entry.newPath, defaultConfig.dryRun ?? false);
        }
        for (const entry of renameMap.folderRenames) {
            this.applyRename(entry.oldPath, entry.newPath, defaultConfig.dryRun ?? false);
        }
        const totalChanges = renameMap.fileRenames.length + renameMap.folderRenames.length;
        console.log(chalk_1.default.cyan(`\n  ✔ ${totalChanges} item(s) ${defaultConfig.dryRun ? "would be" : ""} renamed.\n`));
    },
    buildRenameMap(fullPath) {
        const { files, folders } = (0, resolver_1.pathResolver)(fullPath, { recursive: true });
        const fileRenames = [];
        const folderRenames = [];
        for (const filePath of files) {
            const ext = path_1.default.extname(filePath).slice(1);
            if (!defaultConfig.file.includes(ext))
                continue;
            const basename = path_1.default.basename(filePath, `.${ext}`);
            const currentCase = (0, case_identifier_1.caseIdentifier)(basename);
            if (currentCase !== defaultConfig.case) {
                const newName = this.transform(basename, defaultConfig.case);
                const finalName = `${newName}.${ext}`;
                const newPath = path_1.default.join(path_1.default.dirname(filePath), finalName);
                fileRenames.push({ oldPath: filePath, newPath });
            }
        }
        if (defaultConfig.operate === "full") {
            const sortedFolders = folders.sort((a, b) => b.length - a.length);
            for (const folderPath of sortedFolders) {
                const basename = path_1.default.basename(folderPath);
                const currentCase = (0, case_identifier_1.caseIdentifier)(basename);
                if (currentCase !== defaultConfig.case) {
                    const newName = this.transform(basename, defaultConfig.case);
                    const newPath = path_1.default.join(path_1.default.dirname(folderPath), newName);
                    folderRenames.push({ oldPath: folderPath, newPath: newPath });
                }
            }
        }
        const folderFileRenames = [];
        if (folderRenames.length > 0) {
            for (const filePath of files) {
                const normalized = filePath.replace(/\\/g, "/");
                let newFilePath = normalized;
                let changed = false;
                for (const fr of folderRenames) {
                    const oldDir = fr.oldPath.replace(/\\/g, "/");
                    const newDir = fr.newPath.replace(/\\/g, "/");
                    if (newFilePath.startsWith(oldDir + "/")) {
                        newFilePath = newDir + newFilePath.slice(oldDir.length);
                        changed = true;
                    }
                }
                if (changed) {
                    const existingRename = fileRenames.find((r) => r.oldPath.replace(/\\/g, "/") === normalized);
                    if (existingRename) {
                        let updatedNew = existingRename.newPath.replace(/\\/g, "/");
                        for (const fr of folderRenames) {
                            const oldDir = fr.oldPath.replace(/\\/g, "/");
                            const newDir = fr.newPath.replace(/\\/g, "/");
                            if (updatedNew.startsWith(oldDir + "/")) {
                                updatedNew = newDir + updatedNew.slice(oldDir.length);
                            }
                        }
                        existingRename.newPath = updatedNew;
                    }
                    else {
                        folderFileRenames.push({
                            oldPath: normalized,
                            newPath: newFilePath,
                        });
                    }
                }
            }
        }
        return { fileRenames, folderRenames, folderFileRenames };
    },
    applyRename(oldPath, newPath, dryRun) {
        const oldName = path_1.default.basename(oldPath);
        const newName = path_1.default.basename(newPath);
        if (dryRun) {
            console.log(chalk_1.default.yellow(`  [DRY RUN] ${oldName} ➝ ${newName}`));
        }
        else {
            fs_1.default.renameSync(oldPath, newPath);
            console.log(chalk_1.default.cyan(`  ✔ Renamed: ${oldName} ➝ ${newName}`));
        }
    },
    rename(fullPath, name, ext, currentCase) {
        const newName = this.transform(name, defaultConfig.case);
        const finalName = ext ? `${newName}.${ext}` : newName;
        const newPath = path_1.default.join(path_1.default.dirname(fullPath), finalName);
        if (defaultConfig.dryRun) {
            console.log(chalk_1.default.yellow(`[DRY RUN] ${path_1.default.basename(fullPath)} ➝ ${finalName}`));
        }
        else {
            fs_1.default.renameSync(fullPath, newPath);
            console.log(chalk_1.default.cyan(`✔ Renamed: ${finalName}`));
        }
    },
    transform(str, target) {
        if (target === "kebab")
            return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
        if (target === "camel")
            return str
                .replace(/[-_](.)/g, (_, g) => g.toUpperCase())
                .replace(/^(.)/, (g) => g.toLowerCase());
        if (target === "pascal")
            return str
                .replace(/[-_](.)/g, (_, g) => g.toUpperCase())
                .replace(/^(.)/, (g) => g.toUpperCase());
        return str;
    },
};
//# sourceMappingURL=casely.js.map