const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /function\s+updateLocalUserBalance|const\s+updateLocalUserBalance|updateLocalUserBalance\s*=/g;
let match;
while ((match = regex.exec(code)) !== null) {
  console.log(`Match at index ${match.index}:`);
  console.log(code.substring(match.index, match.index + 1500));
  console.log('-------------------------------------------');
}
