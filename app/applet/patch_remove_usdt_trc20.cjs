const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const dirsToScan = ['public/assets', 'dist/assets', 'dist_backup/assets', 'app'];

const selfName = 'patch_remove_usdt_trc20.cjs';

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (filePath.endsWith(selfName)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove `` objects
  const objRegex1 = new RegExp('\\]*\\},?', 'g');
  const objRegex2 = new RegExp('\\]*\\}', 'g');

  content = content.replace(objRegex1, '');
  content = content.replace(objRegex2, '');

  // 2. Remove filter references like E.id==="usdt"
  const filter1 = new RegExp('E\\.id==="usdt"\\|\\|', 'g');
  const filter2 = new RegExp('\\|\\|E\\.id==="usdt"', 'g');
  const filter3 = new RegExp('item\\.id==="usdt"\\|\\|', 'g');
  const filter4 = new RegExp('\\|\\|item\\.id==="usdt"', 'g');

  content = content.replace(filter1, '');
  content = content.replace(filter2, '');
  content = content.replace(filter3, '');
  content = content.replace(filter4, '');

  // 3. Clean up double commas
  content = content.replace(/\[\s*,/g, '[');
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*\]/g, ']');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Patch USDT] Cleaned USDT TRC20 in: ${filePath}`);
  }
}

function scanDir(dir) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) return;
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      scanDir(path.join(dir, entry.name));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
      patchFile(p);
    }
  }
}

dirsToScan.forEach(scanDir);
fs.readdirSync(rootDir).forEach(file => {
  if ((file.endsWith('.cjs') || file.endsWith('.js')) && file !== selfName) {
    patchFile(path.join(rootDir, file));
  }
});

console.log('[Patch USDT] Patch execution finished.');
