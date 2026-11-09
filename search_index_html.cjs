const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (
    line.includes('bonus') ||
    line.includes('Bonus') ||
    line.includes('বোনাস') ||
    line.includes('create-payment') ||
    line.includes('deposit')
  ) {
    matches.push(`${idx + 1}: ${line.trim().substring(0, 150)}`);
  }
});

console.log(matches.join('\n'));
