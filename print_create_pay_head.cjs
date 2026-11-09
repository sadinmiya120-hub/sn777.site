const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const lines = code.split('\n');
console.log(lines.slice(3440, 3480).join('\n'));
