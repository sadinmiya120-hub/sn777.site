const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

const idx = code.indexOf('ya=[');
if (idx !== -1) {
  console.log(code.substring(idx - 50, idx + 1000));
} else {
  console.log('ya=[ not found, searching ya=');
  const idx2 = code.indexOf('bonusPercent');
  console.log(code.substring(idx2 - 200, idx2 + 800));
}
