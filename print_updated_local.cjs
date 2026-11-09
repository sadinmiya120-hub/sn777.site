const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = code.indexOf('const updatedLocal = {');
console.log(code.substring(start, start + 1200));
