const fs = require('fs');

const file = 'dist_backup/assets/index-sn777-v10.js';
if (fs.existsSync(file)) {
  const code = fs.readFileSync(file, 'utf8');
  const idx = code.indexOf('checkPendingAuto=');
  if (idx !== -1) {
    console.log(code.substring(idx, idx + 800));
  }
}
