const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = 74795;
console.log(code.substring(start, start + 1200));
