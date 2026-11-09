const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (
    line.includes('bonus') ||
    line.includes('Bonus') ||
    line.includes('promo') ||
    line.includes('finalCredit') ||
    line.includes('create-payment')
  ) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log(`Found ${matches.length} lines`);
console.log(matches.slice(0, 40).join('\n'));
