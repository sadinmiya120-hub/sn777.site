const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

const idx = code.indexOf('_newDepTx');
console.log(code.substring(idx - 1200, idx + 400));
