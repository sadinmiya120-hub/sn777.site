const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const lines = code.split('\n');
console.log(lines.slice(580, 650).join('\n'));
