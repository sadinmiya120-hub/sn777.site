const fs = require('fs');

const file = 'dist_backup/assets/index-sn777-v10.js';
if (fs.existsSync(file)) {
  const code = fs.readFileSync(file, 'utf8');
  let idx = 0;
  while ((idx = code.indexOf('/api/auto-check-user-deposits', idx)) !== -1) {
    console.log(`Match at ${idx}:`);
    console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 400)));
    console.log('-----------------------------------');
    idx += 30;
  }
}
