const fs = require('fs');
const path = require('path');

const targets = [
  'dist/assets/index-sn777-v12.js',
  'dist_backup/assets/index-sn777-v12.js',
  'original-index-sn777-v5.js',
  'public/assets/index-sn777-v12.js'
];

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // 1. Fix accounts.length === 0 ? o.jsxs
  code = code.replace(/accounts\.length\s*===\s*0\s+o\.jsxs/g, 'accounts.length === 0 ? o.jsxs');
  
  // 2. Fix user ? user.id etc
  code = code.replace(/user\s+user\./g, 'user ? user.');
  
  // 3. Fix the weird install guide array
  // It looks like: ]}) ? ] : [
  // We want to remove the '? ] : [' part and ensure it ends with ]})
  // Actually, looking at the grep, it seems like the condition was removed.
  // The structure is children:[block1, block2, block3] ? ] : [blockA, blockB]
  // This is clearly broken. It should probably be children:isIOS ? [blocks] : [blocks]
  // I will just remove the ternary and keep both blocks or something, but that's hard.
  // Safest: replace ']}) ? ] : [' with ']})' and hope for the best, or restore the condition.
  // Actually, I'll just remove the '? ] : [' noise.
  code = code.replace(/\)\}\)\s*\?\s*\]\s*:\s*\[/g, ')]})');

  // 4. Fix any other IDENTIFIER IDENTIFIER : pattern
  code = code.replace(/([a-zA-Z0-9_\].=!)]{0,1})\s+([a-zA-Z0-9_$.'"\[\]]+)\s+:/g, (match, p1, p2) => {
    if (p1.endsWith('?')) return match;
    if (['return', 'var', 'const', 'let', 'function', 'case', 'yield', 'await', 'delete', 'typeof', 'void', 'new', 'else'].includes(p1)) return match;
    return `${p1} ? ${p2} :`;
  });

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[Fix Ternary] Restored missing question marks in ${path.basename(filePath)}`);
  }
});
