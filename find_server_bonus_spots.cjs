const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const approveIdx = code.indexOf('function approveAndCreditDeposit');
console.log('approveAndCreditDeposit idx:', approveIdx);

const createPayIdx = code.indexOf('/api/create-payment');
console.log('create-payment idx:', createPayIdx);

const gopayPayIdx = code.indexOf('/gopay_pay.php');
console.log('gopay_pay.php idx:', gopayPayIdx);
