const fs = require('fs');
const path = require('path');

const jsTargets = [
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'public/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

console.log('[Remove Hacksaw Fortune] Starting clean check...');

jsTargets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  let code = fs.readFileSync(filePath, 'utf8');
  const targetRegex = /\{title:"Hacksaw Fortune"[^}]+\},?/g;
  
  if (targetRegex.test(code)) {
    code = code.replace(targetRegex, '');
    code = code.replace(/,,/g, ',');
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[Remove Hacksaw Fortune] Removed from ${path.basename(filePath)}`);
  }
});

console.log('[Remove Hacksaw Fortune] Completed.');
