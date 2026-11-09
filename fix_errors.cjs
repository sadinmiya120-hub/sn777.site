const fs = require('fs');
const path = require('path');

console.log('[Fix Syntax] Repairing corrupted files...');

const jsTargets = [
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js'),
  path.join(__dirname, 'public/assets/index-sn777-v12.js')
];

jsTargets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // Fix 1: Missing parenthesis before {
  // Look for the specific long sequence that was likely mis-patched
  if (code.includes('E==="RICH88"{')) {
    code = code.split('E==="RICH88"{').join('E==="RICH88"){');
    console.log(`[Fix Syntax] Fixed RICH88 condition in ${path.basename(filePath)}`);
  }

  // Fix 2: Check for any other provider that might have been broken similarly
  const providers = ["FIVEG", "LUCKY365", "NEXTSPIN", "SG", "FASTSPIN", "YELLOWBAT"];
  providers.forEach(p => {
    if (code.includes(`E==="${p}"{`)) {
      code = code.split(`E==="${p}"{`).join(`E==="${p}"){`);
      console.log(`[Fix Syntax] Fixed ${p} condition in ${path.basename(filePath)}`);
    }
  });

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code, 'utf8');
  }
});

console.log('[Fix Syntax] Completed!');
