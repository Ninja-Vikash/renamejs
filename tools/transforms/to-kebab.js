import fs from 'fs';
import path from 'path';

function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function pascalToKebab(targetPath) {
  const parent = path.dirname(targetPath);
  const currentName = path.basename(targetPath);
  const newName = toKebabCase(currentName);
  const newPath = path.join(parent, newName);

  if (currentName === newName) {
    console.log(`✅ Already in kebab-case: ${currentName}`);
    return;
  }

  try {
    fs.renameSync(targetPath, newPath);
    console.log(`✨ Renamed Pascal → Kebab: ${currentName} ➝ ${newName}`);
  } catch (err) {
    console.error(`❌ Rename failed: ${err.message}`);
  }
}

function camelToKebab(targetPath) {
  const parent = path.dirname(targetPath);
  const currentName = path.basename(targetPath);
  const newName = toKebabCase(currentName);
  const newPath = path.join(parent, newName);

  if (currentName === newName) {
    console.log(`✅ Already in kebab-case: ${currentName}`);
    return;
  }

  try {
    fs.renameSync(targetPath, newPath);
    console.log(`✨ Renamed Camel → Kebab: ${currentName} ➝ ${newName}`);
  } catch (err) {
    console.error(`❌ Rename failed: ${err.message}`);
  }
}

// ----------------------------------------------------

export function toKebab(targetPath, currentType) {
  if (currentType === 'pascal') {
    pascalToKebab(targetPath);
  } else if (currentType === 'camel') {
    camelToKebab(targetPath);
  } else {
    console.log('⚠️ Unsupported case type passed.');
  }
}
