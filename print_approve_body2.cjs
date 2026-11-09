const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const start = 74437 + 3800;
console.log(code.substring(start, start + 3500));
