import { Project, SyntaxKind, SourceFile } from "ts-morph";
import path from "path";
import fs from "fs";
import chalk from "chalk";

// -------------------------------------------------------------

export interface RenameEntry {
  oldPath: string; // absolute path before rename
  newPath: string; // absolute path after rename
}

// -------------------------------------------------------------

/** Normalize a path to forward slashes for consistent map lookups */
function normalize(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Try to resolve a relative module specifier to an absolute file path.
 * Handles extension elision (import "./Foo" → ./Foo.ts) and index files
 * (import "./utils" → ./utils/index.ts).
 */
function resolveSpecifier(
  specifier: string,
  fromFile: string,
  extensions: string[],
): string | null {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, specifier);
  const normalizedResolved = normalize(resolved);

  // 1. Exact match (specifier already has extension)
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return normalizedResolved;
  }

  // 2. Try appending each extension
  for (const ext of extensions) {
    const withExt = `${resolved}.${ext}`;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return normalize(withExt);
    }
  }

  // 3. Try as directory with index file
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index.${ext}`);
    if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
      return normalize(indexFile);
    }
  }

  return null;
}

/**
 * Compute a new relative specifier from `fromFile` to `toFile`,
 * preserving the original extension style (present or elided).
 */
function computeNewSpecifier(
  fromFilePath: string,
  toFilePath: string,
  originalHadExtension: boolean,
): string {
  const fromDir = path.dirname(fromFilePath);
  let relative = path.relative(fromDir, toFilePath).replace(/\\/g, "/");

  // Ensure it starts with ./ or ../
  if (!relative.startsWith(".")) {
    relative = "./" + relative;
  }

  // If original import had no extension, strip it from the new specifier
  if (!originalHadExtension) {
    const ext = path.extname(relative);
    if (ext) {
      relative = relative.slice(0, -ext.length);
    }
  }

  return relative;
}

/** Check if a specifier string has a file extension */
function specifierHasExtension(specifier: string): boolean {
  const basename = path.basename(specifier);
  return basename.includes(".") && !basename.startsWith(".");
}

// -------------------------------------------------------------

/**
 * Rewrites import/require/export specifiers in all source files
 * within `targetDir` according to the provided rename map.
 *
 * MUST be called BEFORE any files are renamed on disk, so that
 * the old paths are still valid for resolution.
 */
export function rewriteImports(
  targetDir: string,
  renameMap: RenameEntry[],
  extensions: string[],
  dryRun: boolean,
): void {
  if (renameMap.length === 0) return;

  // Build lookup: normalized old absolute path → normalized new absolute path
  const lookup = new Map<string, string>();
  for (const entry of renameMap) {
    lookup.set(normalize(entry.oldPath), normalize(entry.newPath));
  }

  // Also build a reverse map for the importing file itself:
  // if the file doing the importing is also being renamed (e.g. its parent
  // directory is renamed), we need to compute relative paths from its NEW location.
  const importerNewPathLookup = new Map<string, string>();
  for (const entry of renameMap) {
    importerNewPathLookup.set(
      normalize(entry.oldPath),
      normalize(entry.newPath),
    );
  }

  // Create a ts-morph project — no tsconfig needed
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      jsx: 1, // JsxEmit.Preserve
      noEmit: true,
    },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  // Add all source files matching the configured extensions
  const globPatterns = extensions.map(
    (ext) => `${normalize(path.resolve(targetDir))}/**/*.${ext}`,
  );
  project.addSourceFilesAtPaths(globPatterns);

  const sourceFiles = project.getSourceFiles();
  let totalRewrites = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = normalize(sourceFile.getFilePath());
    const fileNewPath = importerNewPathLookup.get(filePath) ?? filePath;
    let fileRewrites = 0;

    // --- Process import declarations: import X from "./Y" ---
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      if (!isRelativeSpecifier(specifier)) continue;

      const newSpec = tryRewriteSpecifier(
        specifier,
        filePath,
        fileNewPath,
        extensions,
        lookup,
      );
      if (newSpec) {
        if (dryRun) {
          logRewrite(filePath, specifier, newSpec);
        } else {
          importDecl.setModuleSpecifier(newSpec);
        }
        fileRewrites++;
      }
    }

    // --- Process export declarations: export { X } from "./Y" ---
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      const specifier = exportDecl.getModuleSpecifierValue();
      if (!specifier || !isRelativeSpecifier(specifier)) continue;

      const newSpec = tryRewriteSpecifier(
        specifier,
        filePath,
        fileNewPath,
        extensions,
        lookup,
      );
      if (newSpec) {
        if (dryRun) {
          logRewrite(filePath, specifier, newSpec);
        } else {
          exportDecl.setModuleSpecifier(newSpec);
        }
        fileRewrites++;
      }
    }

    // --- Process require() calls and dynamic import() ---
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;

      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (!callExpr) return;

      const exprText = callExpr.getExpression().getText();

      // Match require("...") or import("...")
      if (exprText !== "require" && exprText !== "import") return;

      const args = callExpr.getArguments();
      if (args.length === 0) return;

      const firstArg = args[0];
      if (firstArg.getKind() !== SyntaxKind.StringLiteral) return;

      const stringLiteral = firstArg.asKind(SyntaxKind.StringLiteral);
      if (!stringLiteral) return;

      const specifier = stringLiteral.getLiteralValue();
      if (!isRelativeSpecifier(specifier)) return;

      const newSpec = tryRewriteSpecifier(
        specifier,
        filePath,
        fileNewPath,
        extensions,
        lookup,
      );
      if (newSpec) {
        if (dryRun) {
          logRewrite(filePath, specifier, newSpec);
        } else {
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
    console.log(
      chalk.magenta(
        `\n  🔗 ${totalRewrites} import path(s) ${verb} rewritten.\n`,
      ),
    );
  }
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

/**
 * Given an original module specifier, try to resolve it and look it up
 * in the rename map. If found, compute and return the new specifier.
 */
function tryRewriteSpecifier(
  specifier: string,
  importerOldPath: string,
  importerNewPath: string,
  extensions: string[],
  lookup: Map<string, string>,
): string | null {
  const resolvedOld = resolveSpecifier(specifier, importerOldPath, extensions);
  if (!resolvedOld) return null;

  const targetNewPath = lookup.get(resolvedOld);

  // Even if the target file isn't renamed, the importer might be moved
  // (e.g. directory rename), requiring a new relative path
  const effectiveTargetPath = targetNewPath ?? resolvedOld;
  const hadExtension = specifierHasExtension(specifier);

  const newSpec = computeNewSpecifier(
    importerNewPath,
    effectiveTargetPath,
    hadExtension,
  );

  // Only return if the specifier actually changed
  if (newSpec !== specifier) {
    return newSpec;
  }

  return null;
}

function logRewrite(
  filePath: string,
  oldSpecifier: string,
  newSpecifier: string,
): void {
  const basename = path.basename(filePath);
  console.log(
    chalk.yellow(`  [dry] `) +
      chalk.gray(`${basename}: `) +
      chalk.white(`"${oldSpecifier}"`) +
      chalk.gray(` ➝ `) +
      chalk.green(`"${newSpecifier}"`),
  );
}
