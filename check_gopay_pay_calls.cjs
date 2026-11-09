const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

let idx = 0;
let count = 0;
console.log(`=== SEARCH gopay_pay.php ===`);
while ((idx = code.indexOf('gopay_pay.php', idx)) !== -1 && count < 10) {
  console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
  console.log('-----------------------------------');
  idx += 15;
  count++;
}
