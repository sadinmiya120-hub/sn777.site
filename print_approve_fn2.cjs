const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = code.indexOf('function approveAndCreditDeposit');
console.log(code.substring(start + 2500, start + 7500));
