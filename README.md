<img width="1420" height="640" alt="casely-js" src="https://github.com/user-attachments/assets/9e49a868-c644-4e8b-9c16-5759ffc35969" />

<br />

<div>
  <h1>Caselyjs - CLI</h1>
</div>

Tired of Codebases with Mismatched File Casing?🛠️ Meet `caselyjs`

<div>
<b>caselyjs</> is a high-performance TypeScript-powered CLI and programmatic utility designed to <b>rename files and directories</b> across your entire codebase using consistent naming conventions.</b>
  <br />
  <br />
> <i>Say goodbye to manually renaming 100+ files in your project!</i>
</div>

## ✨ New in `v1` and above

- **Native TypeScript Support**: Full type definitions included.
- **Powerful CLI**: Run transformations directly from your terminal.
- **Dry Run Mode**: Preview changes before they are applied to your filesystem.
- **Recursive Bottom-Up Renaming**: Safely renames nested directories without breaking paths.
- **Enhanced Extension Support**: Easily filter which file types to transform.

---

## ⚡ The 10-Second Quick Start (No Install Required)

```bash
# Rename all .js/ts files in the current folder to kebab-case
npx caselyjs .

# Run a full conversion to PascalCase on a specific folder
npx caselyjs ./src/components --case pascal --full

# Preview changes in a specific directory without actually renaming anything
npx caselyjs ./my-project --dry
```

> [!IMPORTANT]
>
> ```bash
> # safe command before executing
> npx caselyjs --dry
> ```

### Why this is the "Pro" way to use CaselyJS:

- **No Clutter**: Doesn't stay on the user's machine or in their node_modules.

- **Always Fresh**: npx always pulls the latest version (v1.0.0+), so they get your newest bug fixes and case-identification logic automatically.

- **CI/CD Friendly**: Perfect for use in GitHub Actions or automation scripts where you want to enforce a naming convention during a build step without a permanent install.

## ⚙️ CLI Options

| Flag            | Shorthand | Description                                 | Default         |
| :-------------- | :-------- | :------------------------------------------ | :-------------- |
| `--case`        | -c        | "Target case: camel, kebab, or pascal"      | kebab           |
| `--ext`         | -e        | Comma-separated list of file extensions     | "js,jsx,ts,tsx" |
| `--full`        | -f        | Rename directories in addition to files     | false           |
| `--dry`         |           | Show intended changes without applying them | false           |
| `--no-rewrite`  |           | Skip updating import/require/export paths   | false           |

## 🔗 Safe Refactoring

CaselyJS automatically updates `import`, `require()`, `export ... from`, and dynamic `import()` paths when renaming files — so your project keeps working after a casing transformation.

```bash
# Rename files AND update all import paths
npx caselyjs ./src --case kebab --full

# Rename files but DON'T touch import paths
npx caselyjs ./src --case kebab --no-rewrite
```

Programmatic usage:

```ts
casely.config({
  path: "./src",
  case: "kebab",
  rewriteImports: true, // default — set false to skip
});
```

## 💻 Programmatic Usage

If you prefer to integrate CaselyJS into your own build scripts or tools:

```ts
import { casely } from "caselyjs";

casely.config({
  path: "./src",
  case: "camel",
  file: ["ts", "tsx"],
  operate: "full", // 'partial' (files only) or 'full' (files + folders)
  dryRun: true, // highly recommended for testing
});

await casely.execute();
```

## ⚙️ Advanced Configuration

- **Recursive by Default**: You only need to provide the root directory. CaselyJS automatically traverses all subdirectories.
- **Safety First**: When using operate: "full", CaselyJS uses a bottom-up renaming strategy to ensure directory paths remain valid during the process.

### Supported Case Types

- kebab-case
- camelCase
- PascalCase

## 🛠️ Built With

- **TypeScript** - For type-safe filesystem operations.
- **Commander.js** - Robust CLI argument parsing.
- **Chalk** - Beautifully colored terminal output.

### 🌐 Links

- [dev.to](https://dev.to/thatonevikash/tired-of-codebases-with-mismatched-file-casing-meet-caselyjs-v101-479n)

### 👨‍💻 Author

**Made with ❤️ by _thatonevikash_**
