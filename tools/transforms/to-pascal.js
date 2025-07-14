import fs from 'fs';
import path from 'path';

function toPascalCase(str) {
  return str
    .replace(/[-_](.)/g, (_, group1) => group1.toUpperCase())
    .replace(/^(.)/, (_, group1) => group1.toUpperCase());
}

function kebabToPascal(targetPath) {
  const parent = path.dirname(targetPath);
  const currentName = path.basename(targetPath);
  const newName = toPascalCase(currentName);
  const newPath = path.join(parent, newName);

  if (currentName === newName) {
    console.log(`✅ Already in PascalCase: ${currentName}`);
    return;
  }

  try {
    fs.renameSync(targetPath, newPath);
    console.log(`✨ Renamed Kebab → Pascal: ${currentName} ➝ ${newName}`);
  } catch (err) {
    console.error(`❌ Rename failed: ${err.message}`);
  }
}

function camelToPascal(targetPath) {
  const parent = path.dirname(targetPath);
  const currentName = path.basename(targetPath);
  const newName = currentName.charAt(0).toUpperCase() + currentName.slice(1);
  const newPath = path.join(parent, newName);

  if (currentName === newName) {
    console.log(`✅ Already in PascalCase: ${currentName}`);
    return;
  }

  try {
    fs.renameSync(targetPath, newPath);
    console.log(`✨ Renamed Camel → Pascal: ${currentName} ➝ ${newName}`);
  } catch (err) {
    console.error(`❌ Rename failed: ${err.message}`);
  }
}

// ----------------------------------------------------

export function toPascal(targetPath, currentType) {
  if (currentType === 'kebab') {
    kebabToPascal(targetPath);
  } else if (currentType === 'camel') {
    camelToPascal(targetPath);
  } else {
    console.log('⚠️ Unsupported case type passed.');
  }
}
