const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('function getDepositFinalCredit');
console.log(code.substring(idx, idx + 1500));
