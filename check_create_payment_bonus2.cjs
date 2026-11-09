const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('/api/create-payment');
console.log(code.substring(idx + 1000, idx + 2500));
