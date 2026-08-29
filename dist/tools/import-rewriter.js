"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteImports = rewriteImports;
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
function normalize(p) {
    return p.replace(/\\/g, "/");
}
function resolveSpecifier(specifier, fromFile, extensions) {
    const dir = path_1.default.dirname(fromFile);
    const resolved = path_1.default.resolve(dir, specifier);
    const normalizedResolved = normalize(resolved);
    if (fs_1.default.existsSync(resolved) && fs_1.default.statSync(resolved).isFile()) {
        return normalizedResolved;
    }
    for (const ext of extensions) {
        const withExt = `${resolved}.${ext}`;
        if (fs_1.default.existsSync(withExt) && fs_1.default.statSync(withExt).isFile()) {
            return normalize(withExt);
        }
    }
    for (const ext of extensions) {
        const indexFile = path_1.default.join(resolved, `index.${ext}`);
        if (fs_1.default.existsSync(indexFile) && fs_1.default.statSync(indexFile).isFile()) {
            return normalize(indexFile);
        }
    }
    return null;
}
function computeNewSpecifier(fromFilePath, toFilePath, originalHadExtension) {
    const fromDir = path_1.default.dirname(fromFilePath);
    let relative = path_1.default.relative(fromDir, toFilePath).replace(/\\/g, "/");
    if (!relative.startsWith(".")) {
        relative = "./" + relative;
    }
    if (!originalHadExtension) {
        const ext = path_1.default.extname(relative);
        if (ext) {
            relative = relative.slice(0, -ext.length);
        }
    }
    return relative;
}
function specifierHasExtension(specifier) {
    const basename = path_1.default.basename(specifier);
    return basename.includes(".") && !basename.startsWith(".");
}
function rewriteImports(targetDir, renameMap, extensions, dryRun) {
    if (renameMap.length === 0)
        return;
    const lookup = new Map();
    for (const entry of renameMap) {
        lookup.set(normalize(entry.oldPath), normalize(entry.newPath));
    }
    const importerNewPathLookup = new Map();
    for (const entry of renameMap) {
        importerNewPathLookup.set(normalize(entry.oldPath), normalize(entry.newPath));
    }
    const project = new ts_morph_1.Project({
        compilerOptions: {
            allowJs: true,
            jsx: 1,
            noEmit: true,
        },
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
    });
    const globPatterns = extensions.map((ext) => `${normalize(path_1.default.resolve(targetDir))}/**/*.${ext}`);
    project.addSourceFilesAtPaths(globPatterns);
    const sourceFiles = project.getSourceFiles();
    let totalRewrites = 0;
    for (const sourceFile of sourceFiles) {
        const filePath = normalize(sourceFile.getFilePath());
        const fileNewPath = importerNewPathLookup.get(filePath) ?? filePath;
        let fileRewrites = 0;
        for (const importDecl of sourceFile.getImportDeclarations()) {
            const specifier = importDecl.getModuleSpecifierValue();
            if (!isRelativeSpecifier(specifier))
                continue;
            const newSpec = tryRewriteSpecifier(specifier, filePath, fileNewPath, extensions, lookup);
            if (newSpec) {
                if (dryRun) {
                    logRewrite(filePath, specifier, newSpec);
                }
                else {
                    importDecl.setModuleSpecifier(newSpec);
                }
                fileRewrites++;
            }
        }
        for (const exportDecl of sourceFile.getExportDeclarations()) {
            const specifier = exportDecl.getModuleSpecifierValue();
            if (!specifier || !isRelativeSpecifier(specifier))
                continue;
            const newSpec = tryRewriteSpecifier(specifier, filePath, fileNewPath, extensions, lookup);
            if (newSpec) {
                if (dryRun) {
                    logRewrite(filePath, specifier, newSpec);
                }
                else {
                    exportDecl.setModuleSpecifier(newSpec);
                }
                fileRewrites++;
            }
        }
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== ts_morph_1.SyntaxKind.CallExpression)
                return;
            const callExpr = node.asKind(ts_morph_1.SyntaxKind.CallExpression);
            if (!callExpr)
                return;
            const exprText = callExpr.getExpression().getText();
            if (exprText !== "require" && exprText !== "import")
                return;
            const args = callExpr.getArguments();
            if (args.length === 0)
                return;
            const firstArg = args[0];
            if (firstArg.getKind() !== ts_morph_1.SyntaxKind.StringLiteral)
                return;
            const stringLiteral = firstArg.asKind(ts_morph_1.SyntaxKind.StringLiteral);
            if (!stringLiteral)
                return;
            const specifier = stringLiteral.getLiteralValue();
            if (!isRelativeSpecifier(specifier))
                return;
            const newSpec = tryRewriteSpecifier(specifier, filePath, fileNewPath, extensions, lookup);
            if (newSpec) {
                if (dryRun) {
                    logRewrite(filePath, specifier, newSpec);
                }
                else {
                    stringLiteral.setLiteralValue(newSpec);
                }
                fileRewrites++;
            }
        });
        if (fileRewrites > 0) {
            totalRewrites += fileRewrites;
            if (!dryRun) {
                sourceFile.saveSync();
            }
        }
    }
    if (totalRewrites > 0) {
        const verb = dryRun ? "would be" : "";
        console.log(chalk_1.default.magenta(`\n  🔗 ${totalRewrites} import path(s) ${verb} rewritten.\n`));
    }
}
function isRelativeSpecifier(specifier) {
    return specifier.startsWith("./") || specifier.startsWith("../");
}
function tryRewriteSpecifier(specifier, importerOldPath, importerNewPath, extensions, lookup) {
    const resolvedOld = resolveSpecifier(specifier, importerOldPath, extensions);
    if (!resolvedOld)
        return null;
    const targetNewPath = lookup.get(resolvedOld);
    const effectiveTargetPath = targetNewPath ?? resolvedOld;
    const hadExtension = specifierHasExtension(specifier);
    const newSpec = computeNewSpecifier(importerNewPath, effectiveTargetPath, hadExtension);
    if (newSpec !== specifier) {
        return newSpec;
    }
    return null;
}
function logRewrite(filePath, oldSpecifier, newSpecifier) {
    const basename = path_1.default.basename(filePath);
    console.log(chalk_1.default.yellow(`  [dry] `) +
        chalk_1.default.gray(`${basename}: `) +
        chalk_1.default.white(`"${oldSpecifier}"`) +
        chalk_1.default.gray(` ➝ `) +
        chalk_1.default.green(`"${newSpecifier}"`));
}
//# sourceMappingURL=import-rewriter.js.map