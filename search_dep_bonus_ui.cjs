const fs = require('fs');
const code = fs.readFileSync('dist_backup/assets/index-sn777-v10.js', 'utf8');

const matches = [];
const keywords = ['প্রমোশন', 'বোনাস টাইপ', 'ডিপোজিট বোনাস', 'প্রোমোশন', 'বোনাস অফার', 'ওয়েলকাম বোনাস', 'Welcome Bonus', 'Bonus'];

keywords.forEach(kw => {
  let idx = 0;
  let count = 0;
  console.log(`=== KEYWORD: ${kw} ===`);
  while ((idx = code.indexOf(kw, idx)) !== -1 && count < 5) {
    console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
    console.log('-----------------------------------');
    idx += kw.length + 10;
    count++;
  }
});
