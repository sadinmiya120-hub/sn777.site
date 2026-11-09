const fs = require("fs");
const path = require("path");

// 1. Define new filenames for cache busting
const OLD_JS = "index-sn777-v12.js";
const NEW_JS = "index-sn777-v13-nagad.js";
const CACHE_VER = "sn777-cache-v70";

// 2. Define target replacements
const nagadObj = '{id:"nagad",name:"নগদ",color:"#f7941d",logo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-QTVs9eBas6GpK2ydqhcGMQylNU_pN-s36BYRmohiHGhQ1WatvM-iqpa1sjGrZIMl2qw0UNhtBFMeNATQy3PJW5z8Eet99916DdaTFQ7fXTGyfEthPITh57pDMhcU4aPXAVvXwMNCmF_h5xSOBP_tRoUzfED_jRU-tzOU0vJx19y_FYAe6C-7Z_7ajilj/s447/images%20(1).png"}';
const bkashObj = '{id:"bkash",name:"বিকাশ",color:"#e2136e",logo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4UEkhLBUdrPpR2LIahMVOX-QLJ1WG4J1qhr1UUXqDsJYu30zIBFnIuzxDCs5GXkxhvfbjYiiWUNi8hxAFjGCVyntU1_eJ0aGlAjBCPy_0sUgYbyViV9dinzv32zD9fJrdTHUv-sWXy-3AVQwxByAJYVKepxzGIOs6eri4O_UgKPUxSa5Gqkm_t4AbMuny/s554/images%20(18).jpeg"}';
const usdtObj = '{id:"usdt",name:"USDT TRC20",color:"#26a17b",logo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj7XQ7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e7a7e/s128/usdt.png"}';

const chips500 = '[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]';
const chips200 = '[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]';

function applyPatches(content) {
  // 1. Swap order: Nagad first, bKash second (Only active clean methods: Nagad & bKash)
  const biArrayRegex = /Bi\s*=\s*\[\s*\{id:"(?:bkash|nagad)"[\s\S]*?\]/;
  content = content.replace(biArrayRegex, `Bi=[${nagadObj},${bkashObj}]`);

  // 2. Change default selected method to empty string (no method selected initially)
  content = content.replace(/useState\("bkash"\)/g, 'useState("")');
  content = content.replace(/useState\("nagad"\)/g, 'useState("")');

  // 3. Make chips starting from 200 BDT for both bKash and Nagad
  const chipsRegex = /\[\{amount:"200",displayOrig:"200"[\s\S]*?\]/g;
  content = content.replace(chipsRegex, chips200);

  // 4. Update limit labels to 200 - 25,000 for both
  const labelRegex = /children:"সীমা: ৳".*?" - ৳২৫,০০০"/g;
  content = content.replace(labelRegex, 'children:"সীমা: ৳২০০ - ৳২৫,০০০"');

  // 5. Update Kr function minimum deposit and GoPay redirect
  const krFuncRegex = /Kr\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[zs\s*,\s*lo\]/g;
  const newKr = `Kr=async()=>{
  const _effUid=(gt.currentUser&&gt.currentUser.uid)||(typeof ve!=="undefined"&&ve&&(ve.id||ve.uid))||(window.__sn777_user_profile&&(window.__sn777_user_profile.uid||window.__sn777_user_profile.id))||localStorage.getItem("sn777_user_id")||localStorage.getItem("sn777_username")||"";
  if(!_effUid){Fe("অনুগ্রহ করে প্রথমে লগইন করুন।");Je(!0);return;}
  if(!Be){Fe("দয়া করে পেমেন্ট মাধ্যম সিলেক্ট করুন");Je(!0);return;}
  const E=parseInt(Is||"0"),ee=200,W=25000;
  if(isNaN(E) || E<ee){Fe("সর্বনিম্ন ডিপোজিট "+ee+" টাকা।");Je(!0);return;}
  if(E>W){Fe("সর্বোচ্চ ডিপোজিট ২৫,০০০ টাকা।");Je(!0);return;}
  xe(!0);
  const Te="ORD"+Date.now();
  const _nowIso=new Date().toISOString();
  const _newDepTx={id:Te,order_no:Te,uid:_effUid,type:"deposit",amount:E,method:Be,status:"pending",gateway:"gopay",timestamp:_nowIso,createdAt:_nowIso};
  try{localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}));}catch(e){}
  const _gopayUrl="/pay.php?uid="+encodeURIComponent(_effUid)+"&amount="+encodeURIComponent(E)+"&method="+encodeURIComponent(Be.toLowerCase())+"&order_no="+encodeURIComponent(Te);
  fetch(_gopayUrl,{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{xe(!1);if(d.payUrl||d.pay_url)window.location.href=(d.payUrl||d.pay_url);else window.location.href=_gopayUrl;}).catch(()=>{xe(!1);window.location.href=_gopayUrl;});
},[zs,lo]`;
  content = content.replace(krFuncRegex, newKr);

  return content;
}

// EXECUTION
const assetDirs = ["dist/assets", "public/assets", "dist_backup/assets"];
assetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const oldPath = path.join(dir, OLD_JS);
  const newPath = path.join(dir, NEW_JS);
  
  if (fs.existsSync(oldPath)) {
    let content = fs.readFileSync(oldPath, "utf8");
    content = applyPatches(content);
    fs.writeFileSync(newPath, content, "utf8");
    console.log(`Created and patched ${newPath}`);
  }
});

// Update index.html to load the NEW JS file
const htmlFiles = ["index.html", "dist/index.html", "dist_backup/index.html"];
htmlFiles.forEach(hf => {
  if (fs.existsSync(hf)) {
    let html = fs.readFileSync(hf, "utf8");
    // Replace the JS filename
    const jsNameRegex = new RegExp(OLD_JS.replace(".", "\\."), "g");
    html = html.replace(jsNameRegex, NEW_JS);
    // Force version query param change
    html = html.replace(/\?v=[^"'\s]+/g, `?v=${Date.now()}`);
    fs.writeFileSync(hf, html, "utf8");
    console.log(`Updated ${hf} to point to ${NEW_JS}`);
  }
});

// Update sw.js for cache busting
const swFiles = ["sw.js", "public/sw.js", "dist/sw.js"];
swFiles.forEach(sw => {
  if (fs.existsSync(sw)) {
    let swContent = fs.readFileSync(sw, "utf8");
    swContent = swContent.replace(/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "${CACHE_VER}";`);
    fs.writeFileSync(sw, swContent, "utf8");
    console.log(`Updated cache name in ${sw} to ${CACHE_VER}`);
  }
});

console.log("HARD CACHE BUST PATCH COMPLETE.");
