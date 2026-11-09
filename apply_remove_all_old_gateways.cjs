const fs = require("fs");
const path = require("path");

const filesToClean = [
  "dist/assets/index-sn777-v13-nagad.js",
  "dist_backup/assets/index-sn777-v13-nagad.js",
  "public/assets/index-sn777-v13-nagad.js",
  "dist/assets/index-sn777-v13-final.js",
  "dist_backup/assets/index-sn777-v13-final.js",
  "public/assets/index-sn777-v13-final.js",
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "public/assets/index-sn777-v12.js",
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js"
];

const nagadLogo = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-QTVs9eBas6GpK2ydqhcGMQylNU_pN-s36BYRmohiHGhQ1WatvM-iqpa1sjGrZIMl2qw0UNhtBFMeNATQy3PJW5z8Eet99916DdaTFQ7fXTGyfEthPITh57pDMhcU4aPXAVvXwMNCmF_h5xSOBP_tRoUzfED_jRU-tzOU0vJx19y_FYAe6C-7Z_7ajilj/s447/images%20(1).png";
const bkashLogo = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4UEkhLBUdrPpR2LIahMVOX-QLJ1WG4J1qhr1UUXqDsJYu30zIBFnIuzxDCs5GXkxhvfbjYiiWUNi8hxAFjGCVyntU1_eJ0aGlAjBCPy_0sUgYbyViV9dinzv32zD9fJrdTHUv-sWXy-3AVQwxByAJYVKepxzGIOs6eri4O_UgKPUxSa5Gqkm_t4AbMuny/s554/images%20(18).jpeg";

const cleanBi = `const Bi=[{id:"nagad",name:"নগদ",color:"#f7941d",logo:"${nagadLogo}"},{id:"bkash",name:"বিকাশ",color:"#e2136e",logo:"${bkashLogo}"}]`;

const cleanAvailableMethods = `var availableMethods = [
    { id: "nagad", name: "নগদ", color: "#f7941d", logo: "${nagadLogo}" },
    { id: "bkash", name: "বিকাশ", color: "#e2136e", logo: "${bkashLogo}" }
  ];`;

for (const relPath of filesToClean) {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // 1. Clean Bi array (deposit methods)
  const biRegex = /const\s+Bi\s*=\s*\[\s*\{\s*id\s*:\s*\"(?:bkash|nagad)\"[\s\S]*?\}\s*\];/;
  if (biRegex.test(content)) {
    content = content.replace(biRegex, `${cleanBi};`);
    modified = true;
  }

  // 2. Clean availableMethods (withdrawal bank accounts)
  const availRegex = /var\s+availableMethods\s*=\s*\[\s*\{\s*id\s*:\s*\"(?:bkash|nagad)\"[\s\S]*?\}\s*\];/;
  if (availRegex.test(content)) {
    content = content.replace(availRegex, cleanAvailableMethods);
    modified = true;
  }

  // 3. Make initial selected method state EMPTY (neither bkash nor nagad selected initially)
  if (content.includes('[Be,Ac]=R.useState("nagad")')) {
    content = content.replaceAll('[Be,Ac]=R.useState("nagad")', '[Be,Ac]=R.useState("")');
    modified = true;
  } else if (content.includes('[Be,Ac]=R.useState("bkash")')) {
    content = content.replaceAll('[Be,Ac]=R.useState("bkash")', '[Be,Ac]=R.useState("")');
    modified = true;
  }

  // 4. Force bKash to use the EXACT SAME clean UI as Nagad
  if (content.includes('["bkash","bkash"].includes(Be)?')) {
    content = content.replaceAll('["bkash","bkash"].includes(Be)?', 'false?');
    modified = true;
  }

  // 5. Update limit labels to 200 - 25,000 BDT for both bKash and Nagad
  if (content.includes('children:"সীমা: ৳"+(Be==="bkash"?"৫০০":"২০০")+" - ৳২৫,০০০"')) {
    content = content.replaceAll('children:"সীমা: ৳"+(Be==="bkash"?"৫০০":"২০০")+" - ৳২৫,০০০"', 'children:"সীমা: ৳২০০ - ৳২৫,০০০"');
    modified = true;
  }

  // 6. Update Kr (deposit submit handler) to require payment method selection and 200 BDT min deposit
  const krValidationSnippet = `if(!_effUid){Fe("অনুগ্রহ করে প্রথমে লগইন করুন।");Je(!0);return;}`;
  const krValidationReplacement = `if(!_effUid){Fe("অনুগ্রহ করে প্রথমে লগইন করুন।");Je(!0);return;}if(!Be){Fe("দয়া করে পেমেন্ট মাধ্যম সিলেক্ট করুন");Je(!0);return;}`;
  if (content.includes(krValidationSnippet) && !content.includes('if(!Be){Fe("দয়া করে পেমেন্ট মাধ্যম সিলেক্ট করুন') && !content.includes('if(!Be){Fe("দয়া করে পেমেন্ট মাধ্যম সিলেক্ট করুন')) {
    content = content.replaceAll(krValidationSnippet, krValidationReplacement);
    modified = true;
  }

  if (content.includes('ee=(Be==="bkash"?500:200)')) {
    content = content.replaceAll('ee=(Be==="bkash"?500:200)', 'ee=200');
    modified = true;
  }

  // 7. Ensure _gopayUrl points to /pay.php
  if (content.includes('const _gopayUrl="/cashier.php?')) {
    content = content.replaceAll('const _gopayUrl="/cashier.php?', 'const _gopayUrl="/pay.php?');
    modified = true;
  }

  // 8. Hide channel selector
  const channelHeading = 'children:"ডিপোজিট চ্যানেল নির্বাচন করুন"';
  if (content.includes(channelHeading) && !content.includes('style:{display:"none"},children:[o.jsx("div",{className:"w-1.5 h-5 bg-[#00559b]')) {
    content = content.replace('children:[o.jsx("div",{className:"w-1.5 h-5 bg-[#00559b]', 'style:{display:"none"},children:[o.jsx("div",{className:"w-1.5 h-5 bg-[#00559b]');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`[${relPath}] Successfully applied GoPay & bKash min 200 updates.`);
  }
}

console.log("[GoPay & Deposit UI Patch] All updates completed successfully!");
