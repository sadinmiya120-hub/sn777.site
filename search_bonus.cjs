const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bonus') || line.includes('promo') || line.includes('finalCredit') || line.includes('bonusAmount')) {
    matches.push({ lineNum: idx + 1, text: line });
  }
});

console.log(`Found ${matches.length} matching lines`);
matches.slice(0, 35).forEach(m => console.log(`L${m.lineNum}: ${m.text}`));
