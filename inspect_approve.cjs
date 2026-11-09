const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

function showFn(name) {
  const idx = code.indexOf(name);
  if (idx !== -1) {
    console.log(`=== ${name} ===`);
    console.log(code.substring(idx, idx + 2500));
  } else {
    console.log(`Not found: ${name}`);
  }
}

showFn('approveAndCreditDeposit');
showFn('app.all(["/gopay_notify.php"');
showFn('/api/check-pending');
