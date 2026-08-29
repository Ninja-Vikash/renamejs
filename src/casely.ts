import path from "path";
import fs from "fs";
import { pathResolver } from "./tools/resolver";
import { caseIdentifier } from "./tools/case-identifier";
import { rewriteImports, RenameEntry } from "./tools/import-rewriter";
import { CaselyConfig, CaseType } from "./types";
import chalk from "chalk";

// -------------------------------------------------------------

let defaultConfig: CaselyConfig = {
  path: process.cwd(),
  file: ["js", "jsx", "ts", "tsx"],
  case: "kebab",
  operate: "partial",
  dryRun: false,
  rewriteImports: true,
};

// -------------------------------------------------------------

export const casely = {
  config(options: Partial<CaselyConfig>) {
    defaultConfig = { ...defaultConfig, ...options };
  },

  async execute() {
    const fullPath = path.resolve(defaultConfig.path);

    if (!fs.existsSync(fullPath)) {
      console.log(chalk.red(`\n  Path "${fullPath}" does not exist.\n`));
      return;
    }

    // ── Phase 1: Build the rename map (no filesystem writes) ──
    const renameMap = this.buildRenameMap(fullPath);

    if (renameMap.fileRenames.length === 0 && renameMap.folderRenames.length === 0) {
      console.log(
        chalk.green("\n  ✔ All names already match the target case.\n"),
      );
      return;
    }

    // ── Phase 2a: Rewrite imports BEFORE renaming files ──
    if (defaultConfig.rewriteImports !== false) {
      const allRenames = [...renameMap.fileRenames, ...renameMap.folderFileRenames];
      rewriteImports(
        fullPath,
        allRenames,
        defaultConfig.file,
        defaultConfig.dryRun ?? false,
      );
    }

    // ── Phase 2b: Apply file renames ──
    for (const entry of renameMap.fileRenames) {
      this.applyRename(entry.oldPath, entry.newPath, defaultConfig.dryRun ?? false);
    }

    // ── Phase 2c: Apply folder renames (bottom-up) ──
    for (const entry of renameMap.folderRenames) {
      this.applyRename(entry.oldPath, entry.newPath, defaultConfig.dryRun ?? false);
    }

    const totalChanges =
      renameMap.fileRenames.length + renameMap.folderRenames.length;
    console.log(
      chalk.cyan(
        `\n  ✔ ${totalChanges} item(s) ${defaultConfig.dryRun ? "would be" : ""} renamed.\n`,
      ),
    );
  },

  /**
   * Walk the file tree and compute all renames without touching the filesystem.
   * Returns separate lists for file renames, folder renames, and "folderFileRenames"
   * (files whose absolute path changes because a parent directory is renamed).
   */
  buildRenameMap(fullPath: string): {
    fileRenames: RenameEntry[];
    folderRenames: RenameEntry[];
    folderFileRenames: RenameEntry[];
  } {
    const { files, folders } = pathResolver(fullPath, { recursive: true });

    const fileRenames: RenameEntry[] = [];
    const folderRenames: RenameEntry[] = [];

    // 1. Compute file renames
    for (const filePath of files) {
      const ext = path.extname(filePath).slice(1);
      if (!defaultConfig.file.includes(ext)) continue;

      const basename = path.basename(filePath, `.${ext}`);
      const currentCase = caseIdentifier(basename);

      if (currentCase !== defaultConfig.case) {
        const newName = this.transform(basename, defaultConfig.case);
        const finalName = `${newName}.${ext}`;
        const newPath = path.join(path.dirname(filePath), finalName);
        fileRenames.push({ oldPath: filePath, newPath });
      }
    }

    // 2. Compute folder renames (bottom-up: longest paths first)
    if (defaultConfig.operate === "full") {
      const sortedFolders = folders.sort((a, b) => b.length - a.length);
      for (const folderPath of sortedFolders) {
        const basename = path.basename(folderPath);
        const currentCase = caseIdentifier(basename);

        if (currentCase !== defaultConfig.case) {
          const newName = this.transform(basename, defaultConfig.case);
          const newPath = path.join(path.dirname(folderPath), newName);
          folderRenames.push({ oldPath: folderPath, newPath: newPath });
        }
      }
    }

    // 3. Compute cascading path changes for files inside renamed directories.
    //    When a directory is renamed, every file inside it gets a new absolute
    //    path — even files whose own name doesn't change. We need these in the
    //    rename map so the import rewriter can compute correct relative paths.
    const folderFileRenames: RenameEntry[] = [];

    if (folderRenames.length > 0) {
      // Re-scan all files (including ones not in `defaultConfig.file` extensions,
      // since they might be import targets)
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
          // Check if this file also has its own rename
          const existingRename = fileRenames.find(
            (r) => r.oldPath.replace(/\\/g, "/") === normalized,
          );
          if (existingRename) {
            // Update the existing rename entry's newPath to account for the dir rename
            let updatedNew = existingRename.newPath.replace(/\\/g, "/");
            for (const fr of folderRenames) {
              const oldDir = fr.oldPath.replace(/\\/g, "/");
              const newDir = fr.newPath.replace(/\\/g, "/");
              if (updatedNew.startsWith(oldDir + "/")) {
                updatedNew = newDir + updatedNew.slice(oldDir.length);
              }
            }
            existingRename.newPath = updatedNew;
          } else {
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

  applyRename(oldPath: string, newPath: string, dryRun: boolean) {
    const oldName = path.basename(oldPath);
    const newName = path.basename(newPath);

    if (dryRun) {
      console.log(
        chalk.yellow(`  [DRY RUN] ${oldName} ➝ ${newName}`),
      );
    } else {
      fs.renameSync(oldPath, newPath);
      console.log(chalk.cyan(`  ✔ Renamed: ${oldName} ➝ ${newName}`));
    }
  },

  rename(fullPath: string, name: string, ext: string, currentCase: CaseType) {
    const newName = this.transform(name, defaultConfig.case);
    const finalName = ext ? `${newName}.${ext}` : newName;
    const newPath = path.join(path.dirname(fullPath), finalName);

    if (defaultConfig.dryRun) {
      console.log(
        chalk.yellow(`[DRY RUN] ${path.basename(fullPath)} ➝ ${finalName}`),
      );
    } else {
      fs.renameSync(fullPath, newPath);
      console.log(chalk.cyan(`✔ Renamed: ${finalName}`));
    }
  },

  transform(str: string, target: CaseType): string {
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
