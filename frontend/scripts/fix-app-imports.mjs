import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '../src/app');
const srcModules = ['features', 'config', 'constants', 'utils', 'hooks'];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(ent.name)) fixFile(p);
  }
}

function fixFile(filePath) {
  const rel = path.relative(appDir, filePath);
  const depth = rel.split(path.sep).length - 1;
  const prefix = '../'.repeat(depth + 1);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const mod of srcModules) {
    const re = new RegExp(`from (['"])(?:\\.\\./)+${mod}/`, 'g');
    const next = content.replace(re, `from $1${prefix}${mod}/`);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(filePath, content);
}

walk(appDir);
console.log('imports fixed');
