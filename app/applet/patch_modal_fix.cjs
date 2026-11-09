const fs = require("fs");

function patch(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  // 1. Add persistence storage check on login/mount
  let targetCheck = `R.useEffect(()=>{if(!gt.currentUser)return;`;
  let replacementCheck = `R.useEffect(()=>{if(!gt.currentUser)return;try{const savedMsg=localStorage.getItem("sn777_persist_success");if(savedMsg){sr(savedMsg);Er(!0);}}catch(e){}`;
  if (code.includes(targetCheck)) {
    code = code.replace(targetCheck, replacementCheck);
  }

  // 2. Patch success triggers to save to localStorage
  code = code.replace(
    /sr\(`🎉 পেমেন্ট সফল হয়েছে!([^`]+)`\);Er\(!0\)/g,
    `const sMsg = \`🎉 পেমেন্ট সফল হয়েছে!\$1\`; sr(sMsg); try{localStorage.setItem("sn777_persist_success", sMsg);}catch(e){} Er(!0)`
  );

  // 3. Patch modal close buttons and backdrop to clear localStorage
  code = code.replace(
    /onClick:\(\)=>{Er\(!1\),sr\("আপনার ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা দেওয়া হয়েছে।"\)}/g,
    `onClick:()=>{try{localStorage.removeItem("sn777_persist_success");}catch(e){} Er(!1),sr("আপনার ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা দেওয়া হয়েছে।")}`
  );
  code = code.replace(
    /onClick:\(\)=>{Er\(!1\);sr\("আপনার ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা দেওয়া হয়েছে।"\)}/g,
    `onClick:()=>{try{localStorage.removeItem("sn777_persist_success");}catch(e){} Er(!1);sr("আপনার ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা দেওয়া হয়েছে।")}`
  );

  // 4. Improve modal styling and padding for full visibility
  code = code.replace(
    /className:"relative w-full max-w-\[300px\] overflow-hidden rounded-\[20px\]/g,
    `className:"relative w-full max-w-[340px] overflow-hidden rounded-[2.5rem]`
  );
  code = code.replace(
    /className:"fixed inset-0 z-\[99999999\] flex items-center justify-center p-4 pb-12 sm:pb-16 select-none overflow-y-auto overscroll-contain"/g,
    `className:"fixed inset-0 z-[99999999] flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto overscroll-contain"`
  );

  fs.writeFileSync(file, code, "utf8");
  console.log("Patched successfully:", file);
}

patch("dist/assets/index-CUhzlpga-v3.js");
patch("dist_backup/assets/index-CUhzlpga-v3.js");
