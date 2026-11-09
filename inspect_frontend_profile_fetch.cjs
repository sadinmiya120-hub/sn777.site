const fs = require('fs');

const file = 'dist_backup/assets/index-sn777-v10.js';
if (fs.existsSync(file)) {
  const code = fs.readFileSync(file, 'utf8');
  
  console.log('--- Search for user profile fetch in JS ---');
  let idx = 0;
  while ((idx = code.indexOf('/api/lookup-user', idx)) !== -1) {
    console.log(`Match at ${idx}:`);
    console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
    console.log('-----------------------------------');
    idx += 16;
  }
}
