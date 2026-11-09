const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('/api/gopay-notify');
console.log(code.substring(idx - 100, idx + 2000));
