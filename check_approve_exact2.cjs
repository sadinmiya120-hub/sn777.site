const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = 74437;
console.log(code.substring(start + 2500, start + 5500));
