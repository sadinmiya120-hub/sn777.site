const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('/api/check-pending') || line.includes('gopay') || line.includes('propay') || line.includes('callback') || line.includes('notify') || line.includes('approveAndCreditDeposit')) {
    matches.push({ lineNum: idx + 1, text: line });
  }
});

console.log(`Found ${matches.length} matching lines`);
matches.slice(0, 40).forEach(m => console.log(`L${m.lineNum}: ${m.text}`));
