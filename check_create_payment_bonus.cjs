const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('/api/create-payment');
console.log(code.substring(idx, idx + 2000));
