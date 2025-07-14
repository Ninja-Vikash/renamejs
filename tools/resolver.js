import fs from 'fs';
import path from 'path';

/**
 * List all files and folders in a given path
 * @param {string} targetPath - The directory to scan
 * @param {Object} options
 * @param {boolean} [options.recursive=false] - If true, lists recursively
 * @returns {{ files: string[], folders: string[] }}
 */
export function pathResolver(targetPath, options = { recursive: false }) {
  const result = {
    files: [],
    folders: [],
  };

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        result.folders.push(fullPath.replace(/\\/g, '/'));
        if (options.recursive) {
          scan(fullPath);
        }
      } else if (entry.isFile()) {
        result.files.push(fullPath.replace(/\\/g, '/'));
      }
    }
  }

  scan(targetPath);
  return result;
}
