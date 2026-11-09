const fs = require('fs');
const path = require('path');

console.log('[Fix Deposit Balance & Cancelled Stats] Starting patch...');

const jsTargets = [
  path.join(__dirname, 'public/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

jsTargets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix client side balance calculation when submitting deposit
  const oldBalPattern = /parseFloat\(String\(Fn\.balance\|\|"0"\)\.replace\(\/,\/g,""\)\)\+Ke/g;
  const newBalPattern = 'Math.max(parseFloat(String((typeof ve!=="undefined"&&ve&&ve.balance)||"0").replace(/,/g,"")),parseFloat(String(Fn.balance||"0").replace(/,/g,"")))+Ke';

  if (oldBalPattern.test(code)) {
    code = code.replace(oldBalPattern, newBalPattern);
    changed = true;
    console.log(`[Fix Deposit Balance] Patched client balance logic in ${path.basename(filePath)}`);
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
  }
});

console.log('[Fix Deposit Balance & Cancelled Stats] Completed successfully!');
