const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf("app.all('/api/create-payment'");
if (idx === -1) {
  const idx2 = code.indexOf("/api/create-payment");
  console.log(code.substring(idx2 - 50, idx2 + 2500));
} else {
  console.log(code.substring(idx - 50, idx + 2500));
}
