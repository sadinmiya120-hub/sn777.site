const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

const idx = code.indexOf('/gopay_pay.php?uid=');
console.log(code.substring(idx - 600, idx + 600));
