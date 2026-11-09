const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');

const keywords = ['/api/gopay', 'gopay', 'mchOrderNo', 'ORD1790554559210', 'callback', 'notify'];
keywords.forEach(kw => {
  let idx = 0;
  console.log(`=== KEYWORD: ${kw} ===`);
  while ((idx = code.indexOf(kw, idx)) !== -1) {
    console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
    console.log('-----------------------------------');
    idx += kw.length + 10;
  }
});
