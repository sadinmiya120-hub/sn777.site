const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /function\s+approveAndCreditDeposit|const\s+approveAndCreditDeposit|approveAndCreditDeposit\s*=/g;
let match;
while ((match = regex.exec(code)) !== null) {
  console.log(`Match at index ${match.index}:`);
  console.log(code.substring(match.index, match.index + 2000));
  console.log('-------------------------------------------');
}
