const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

const keywords = ['/gopay', 'gopay', 'propay', '/pay', 'deposit', 'recharge', 'bonus'];
keywords.forEach(kw => {
  let idx = 0;
  let count = 0;
  console.log(`=== KEYWORD: ${kw} ===`);
  while ((idx = code.indexOf(kw, idx)) !== -1 && count < 3) {
    console.log(code.substring(Math.max(0, idx - 80), Math.min(code.length, idx + 250)));
    console.log('-----------------------------------');
    idx += kw.length + 10;
    count++;
  }
});
