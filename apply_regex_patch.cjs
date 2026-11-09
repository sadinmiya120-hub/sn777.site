const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const regex = /checkPendingAuto=\(\)=>\{if\(!gt\.currentUser\)return;fetch\("\/api\/auto-check-user-deposits".*?\.catch\(\)=>\{\}\);/;

const assetDirs = ['dist/assets', 'dist_backup/assets'];
let patchedCount = 0;

assetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, 'utf8');

    if (regex.test(code)) {
      const match = code.match(regex)[0];
      console.log(`Match found in ${filePath}, length: ${match.length}`);

      const newFunc = `checkPendingAuto=()=>{if(!gt.currentUser)return;fetch("/api/auto-check-user-deposits",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:(gt.currentUser?gt.currentUser.uid:"")})}).then(r=>r.json()).then(res=>{if(res&&res.success){if(res.user&&res.user.balance){ss(prev=>{if(!prev)return res.user;const _oldB=parseFloat(String(prev.balance||"0").replace(/,/g,""))||0;const _newB=parseFloat(String(res.user.balance||"0").replace(/,/g,""))||0;if(_newB!==_oldB||res.user.balance!==prev.balance){const _upd={...prev,...res.user,balance:res.user.balance};try{localStorage.setItem("sn777_cached_profile_full",JSON.stringify(_upd))}catch(e){}return _upd}return prev});}if(res.results&&res.results.length>0){const appItem=res.results.find(it=>it.result&&it.result.success);if(appItem){try{localStorage.removeItem("sn777_pending_order")}catch(e){}const _depAmt=Number(appItem.result.finalCredit||appItem.result.amount||appItem.amount||0);const _ordKey=String(appItem.order_no||appItem.id||(appItem.result&&appItem.result.order_no)||"");if(_depAmt>0&&(!window.__sn777_notified_orders||!window.__sn777_notified_orders[_ordKey])){if(!window.__sn777_notified_orders)window.__sn777_notified_orders={};if(_ordKey)window.__sn777_notified_orders[_ordKey]=true;const sMsg=\`🎉 পেমেন্ট সফল হয়েছে! ৳\${_depAmt} টাকা একাউন্টে যোগ করা হয়েছে。\`;sr(sMsg);Er(!0)}}}}}).catch(()=>{})};`;

      code = code.replace(regex, newFunc);
      try {
        esbuild.transformSync(code, { loader: 'js' });
        fs.writeFileSync(filePath, code, 'utf8');
        console.log(`[SUCCESS] Patched checkPendingAuto in ${filePath}`);
        patchedCount++;
      } catch (err) {
        console.error(`[ERROR] esbuild transform failed for ${filePath}:`, err.message);
      }
    } else {
      console.log(`[Notice] regex not found in ${filePath}`);
    }
  });
});

console.log(`Finished patching! Total files updated: ${patchedCount}`);
