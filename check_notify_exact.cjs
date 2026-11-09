const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('/gopay_notify.php');
console.log(code.substring(idx - 100, idx + 2500));
