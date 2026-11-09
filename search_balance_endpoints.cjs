const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const matches = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('balance') || line.includes('getUser') || line.includes('/api/me') || line.includes('/api/balance')) {
    if (line.includes('app.get') || line.includes('app.post') || line.includes('function')) {
      matches.push({ lineNum: idx + 1, text: line });
    }
  }
});

console.log(`Found ${matches.length} matching lines`);
matches.slice(0, 30).forEach(m => console.log(`L${m.lineNum}: ${m.text}`));
