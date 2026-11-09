const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const assetDirs = ['dist/assets', 'dist_backup/assets'];
let patchedCount = 0;

assetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix checkPendingAuto so it ALWAYS updates user balance even if results is empty
    const oldCheckPattern = /if\(res&&res\.success&&res\.results&&res\.results\.length>0\)\{const appItem=res\.results\.find\(it=>it\.result&&it\.result\.success\);if\(appItem\)\{try\{localStorage\.removeItem\("sn777_pending_order"\)\}catch\(e\)\{\}if\(res\.user\)\{ss\(prev=>prev\?\{\.\.\.prev,balance:res\.user\.balance,totalDeposited:res\.user\.totalDeposited,approvedDepositsCount:res\.user\.approvedDepositsCount,adminApproved:res\.user\.adminApproved\}:null\)\}/;

    const newCheckPattern = `if(res&&res.success){if(res.user&&res.user.balance){ss(prev=>{if(!prev)return res.user;const _oldB=parseFloat(String(prev.balance||"0").replace(/,/g,""))||0;const _newB=parseFloat(String(res.user.balance||"0").replace(/,/g,""))||0;if(_newB!==_oldB||res.user.balance!==prev.balance){const _upd={...prev,...res.user,balance:res.user.balance};try{localStorage.setItem("sn777_cached_profile_full",JSON.stringify(_upd));}catch(e){}return _upd;}return prev;});}if(res.results&&res.results.length>0){const appItem=res.results.find(it=>it.result&&it.result.success);if(appItem){try{localStorage.removeItem("sn777_pending_order")}catch(e){}`;

    if (oldCheckPattern.test(code)) {
      code = code.replace(oldCheckPattern, newCheckPattern);
      modified = true;
      console.log(`[Patch] Updated checkPendingAuto balance sync in ${filePath}`);
    }

    if (modified) {
      try {
        esbuild.transformSync(code, { loader: 'js' });
        fs.writeFileSync(filePath, code, 'utf8');
        console.log(`[OK] Successfully saved ${filePath}`);
        patchedCount++;
      } catch (err) {
        console.error(`[ERROR] Syntax validation failed for ${filePath}:`, err);
      }
    }
  });
});

console.log(`Frontend patch complete! Patched ${patchedCount} files.`);
