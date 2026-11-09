const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const lines = code.split('\n');
console.log(lines.slice(2700, 2920).join('\n'));
