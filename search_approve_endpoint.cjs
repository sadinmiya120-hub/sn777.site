const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('/api/approve-deposit') || line.includes('/api/submit-trxid') || line.includes('submit-trxid')) {
    matches.push({ lineNum: idx + 1, text: line });
  }
});

console.log(`Found ${matches.length} matching lines`);
matches.slice(0, 20).forEach(m => console.log(`L${m.lineNum}: ${m.text}`));
