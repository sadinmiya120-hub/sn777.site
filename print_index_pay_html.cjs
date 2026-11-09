const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const lines = code.split('\n');
console.log(lines.slice(220, 310).join('\n'));
