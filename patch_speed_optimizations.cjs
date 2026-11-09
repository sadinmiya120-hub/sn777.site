const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v13-nagad.js",
  "dist_backup/assets/index-sn777-v13-nagad.js",
  "public/assets/index-sn777-v13-nagad.js",
  "dist/assets/index-sn777-v13-final.js",
  "public/assets/index-sn777-v13-final.js",
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "public/assets/index-sn777-v12.js",
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Instant withdrawal submission feedback (0ms instead of 1200ms)
  const oldWithdrawDelay = 'setTimeout(()=>{xe(!1),nt("উইথড্র রিকোয়েস্ট সফল"),De(!0)},1200)';
  const newWithdrawDelay = 'setTimeout(()=>{xe(!1),nt("উইথড্র রিকোয়েস্ট সফল"),De(!0)},0)';
  if (code.includes(oldWithdrawDelay)) {
    code = code.replaceAll(oldWithdrawDelay, newWithdrawDelay);
    modified = true;
    console.log(`[${file}] Reduced withdrawal submit delay to 0ms`);
  }

  // 2. Instant deposit submission feedback (0ms instead of 3000ms)
  const oldDepDelay = 'setTimeout(()=>{try{window._sn777_dep_submitting=!1;xe(!1)}catch(e){}},3000)';
  const newDepDelay = 'setTimeout(()=>{try{window._sn777_dep_submitting=!1;xe(!1)}catch(e){}},0)';
  if (code.includes(oldDepDelay)) {
    code = code.replaceAll(oldDepDelay, newDepDelay);
    modified = true;
    console.log(`[${file}] Reduced deposit submit delay to 0ms`);
  }

  // 3. Balanced auto-check pending interval: 6000ms (avoids CPU/network jank while maintaining fast approvals)
  if (code.includes('checkPendingAuto,2000')) {
    code = code.replaceAll('checkPendingAuto,2000', 'checkPendingAuto,6000');
    modified = true;
    console.log(`[${file}] Optimized pending deposit check interval to 6s`);
  } else if (code.includes('setInterval(checkPendingAuto,5000)')) {
    code = code.replaceAll('setInterval(checkPendingAuto,5000)', 'setInterval(checkPendingAuto,6000)');
    modified = true;
    console.log(`[${file}] Optimized pending deposit check interval to 6s`);
  }

  // 4. Instant Aviator game loading (accelerate loading screen from 4.5s to ~300ms)
  if (code.includes('setTimeout(()=>g("spribe"),800)')) {
    code = code.replaceAll('setTimeout(()=>g("spribe"),800)', 'setTimeout(()=>g("spribe"),100)');
    modified = true;
  }
  if (code.includes('setTimeout(()=>g("playing"),1800)')) {
    code = code.replaceAll('setTimeout(()=>g("playing"),1800)', 'setTimeout(()=>g("playing"),200)');
    modified = true;
  }
  if (code.includes('setTimeout(()=>g("playing"),1500)')) {
    code = code.replaceAll('setTimeout(()=>g("playing"),1500)', 'setTimeout(()=>g("playing"),200)');
    modified = true;
  }
  if (code.includes('b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),100),100):G+2)},30)')) {
    code = code.replaceAll('b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),100),100):G+2)},30)', 'b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),100),100):G+10)},15)');
    modified = true;
  } else if (code.includes('b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),800),100):G+2)},30)')) {
    code = code.replaceAll('b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),800),100):G+2)},30)', 'b(G=>G>=100?(clearInterval(Y),setTimeout(()=>g("spribe"),100),100):G+10)},15)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Saved speed optimizations!`);
  }
}
