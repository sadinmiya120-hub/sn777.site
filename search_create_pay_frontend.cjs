const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

let idx = 0;
let count = 0;
console.log(`=== SEARCH /api/create-payment ===`);
while ((idx = code.indexOf('/api/create-payment', idx)) !== -1 && count < 10) {
  console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 350)));
  console.log('-----------------------------------');
  idx += 20;
  count++;
}
