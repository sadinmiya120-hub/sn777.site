const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

console.log('[PT Removal] Executing remove_pt_content.cjs...');

// Support running from any cwd
const rootDir = fs.existsSync(path.join(__dirname, 'dist')) ? __dirname : path.join(__dirname, '..');

const assetDirs = [
  path.join(rootDir, 'dist/assets'),
  path.join(rootDir, 'dist_backup/assets')
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

const itemsToRemove = [
  /,\{title:\"PT\",image:\"[^\"]*provider_pt[^\"]*\",category:\"[^\"]*\",isHot:(!0|!1|true|false)\}/g,
  /\{title:\"PT\",image:\"[^\"]*provider_pt[^\"]*\",category:\"[^\"]*\",isHot:(!0|!1|true|false)\},?/g,
  /,\{title:\"PT[^\"]*\",image:\"[^\"]*\",category:\"PT\"\}/g,
  /\{title:\"PT[^\"]*\",image:\"[^\"]*\",category:\"PT\"\},?/g
];

const clickHandler = 'if(E==="PT"){wr("PT");return}';
let modified = 0;

targetFiles.forEach(filePath => {
  let code = fs.readFileSync(filePath, 'utf8');
  const origLen = code.length;

  itemsToRemove.forEach(regex => {
    code = code.replace(regex, '');
  });

  if (code.includes(clickHandler)) {
    code = code.replace(clickHandler, '');
  }

  code = code.replace(/\|\|Tt==="PT"/g, '');
  code = code.replace(/&&Tt!=="PT"/g, '');

  if (code.length !== origLen) {
    try {
      acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
      fs.writeFileSync(filePath, code, 'utf8');
      modified++;
      console.log(`[PT Removal] Updated: ${path.basename(filePath)}`);
    } catch (e) {
      console.error(`[PT Removal Error] ${filePath}: ${e.message}`);
    }
  }
});

const htmlFiles = [
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'dist/index.html'),
  path.join(rootDir, 'dist_backup/index.html')
];
htmlFiles.forEach(htmlPath => {
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/index-sn777-v10\.js\?v=[^"'\s]+/g, 'index-sn777-v10.js?v=20261022_no_pt_v11');
    fs.writeFileSync(htmlPath, html, 'utf8');
  }
});

console.log(`[PT Removal] Completed successfully! Cleaned ${modified} bundle files.`);
