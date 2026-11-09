const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('approveAndCreditDeposit')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log(matches.join('\n'));
