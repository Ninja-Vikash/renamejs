# 🛠️ caselyjs

**renamejs** is a CLI and programmatic tool that helps you **rename files and folders** in bulk using a consistent naming convention like `kebab-case`, `camelCase`, or `PascalCase`.

> Say goodbye to manually renaming 100+ files in your project!

---

## 📦 Installation

```bash
npm install renamejs
```

## 🚀 Usage

### Minimum setup you need to start with `renamejs`

```js
// index.js
import { rename } from 'caselyjs';

rename.config({
  path: 'src'
});

rename.execute();
```

## ⚙️ Config Options

### Default Options

```js
rename.config({
  path: 'src',
  case: 'kebab',
  file: ['js', 'jsx'],
  operate: 'partial'
})
```

> [!NOTE]\
> `path` is a required property.\
> Don't need to pass any path as `'src/**/*'`, recursive is supported by default.
>
> currently, supporting three `case`s as `'kebab' | 'camel' | 'pascal'`\
> default file extensions `['js', 'jsx']`, can include more extenstion in the array.\
> eg.
> ```js
> rename.config({
>  // ...previous
>   file: ['js', 'jsx', 'ts', 'tsx']
> })
> ```
> default operate mode is `'partial'`, which modifies only files.\
> operate has two variants as `'partial' | 'full'`\
> full will allow you to rename folders too.

### Author
**Made with ❤️ by Ninja-Vikash**
