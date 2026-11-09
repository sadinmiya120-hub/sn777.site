const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = code.indexOf('function approveAndCreditDeposit');
console.log('Index:', start);
console.log(code.substring(start, start + 3000));
