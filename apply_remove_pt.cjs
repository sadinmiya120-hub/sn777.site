const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

console.log('[PT Removal] Starting complete removal of PT from all bundles...');

const assetDirs = [
  path.join(process.cwd(), 'dist/assets'),
  path.join(process.cwd(), 'dist_backup/assets')
];

const targetFiles = new Set();

assetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.startsWith('index-sn777-') && file.endsWith('.js')) {
        targetFiles.add(path.join(dir, file));
      }
    });
  }
});

const standaloneFiles = [
  path.join(process.cwd(), 'original-index-sn777-v5.js')
];
standaloneFiles.forEach(f => {
  if (fs.existsSync(f)) targetFiles.add(f);
});

console.log(`[PT Removal] Found ${targetFiles.size} target JS bundles to process.`);

const itemsToRemove = [
  /,\{title:\"PT\",image:\"[^\"]*provider_pt[^\"]*\",category:\"[^\"]*\",isHot:(!0|!1|true|false)\}/g,
  /\{title:\"PT\",image:\"[^\"]*provider_pt[^\"]*\",category:\"[^\"]*\",isHot:(!0|!1|true|false)\},?/g,
  /,\{title:\"PT[^\"]*\",image:\"[^\"]*\",category:\"PT\"\}/g,
  /\{title:\"PT[^\"]*\",image:\"[^\"]*\",category:\"PT\"\},?/g
];

const clickHandler = 'if(E==="PT"){wr("PT");return}';

let modifiedFiles = 0;

targetFiles.forEach(filePath => {
  let code = fs.readFileSync(filePath, 'utf8');
  const originalLen = code.length;

  itemsToRemove.forEach(regex => {
    code = code.replace(regex, '');
  });

  if (code.includes(clickHandler)) {
    code = code.replace(clickHandler, '');
  }

  code = code.replace(/\|\|Tt==="PT"/g, '');
  code = code.replace(/&&Tt!=="PT"/g, '');

  if (code.length !== originalLen) {
    try {
      acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
      fs.writeFileSync(filePath, code, 'utf8');
      modifiedFiles++;
      console.log(`[PT Removal] Successfully cleaned & validated: ${path.relative(process.cwd(), filePath)}`);
    } catch (err) {
      console.error(`[PT Removal Error] Acorn parse failed on ${filePath}: ${err.message}`);
    }
  } else {
    console.log(`[PT Removal] No PT references found in: ${path.relative(process.cwd(), filePath)}`);
  }
});

// Update index.html files with fresh cache-busting timestamp
const htmlFiles = [
  path.join(process.cwd(), 'index.html'),
  path.join(process.cwd(), 'dist/index.html'),
  path.join(process.cwd(), 'dist_backup/index.html')
];

const cacheBustVersion = '20261022_no_pt_v11';
htmlFiles.forEach(htmlPath => {
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/index-sn777-v10\.js\?v=[^"'\s]+/g, `index-sn777-v10.js?v=${cacheBustVersion}`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`[PT Removal] Updated cache buster in: ${path.relative(process.cwd(), htmlPath)}`);
  }
});

console.log(`[PT Removal] Complete! Modified ${modifiedFiles} files.`);
