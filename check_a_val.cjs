const fs = require('fs');

const file = 'dist_backup/assets/index-sn777-v10.js';
if (fs.existsSync(file)) {
  const code = fs.readFileSync(file, 'utf8');
  const idx = code.indexOf('tx-exact-balance');
  if (idx !== -1) {
    console.log(code.substring(idx - 600, idx + 100));
  }
}
