const fs = require("fs");
const esbuild = require("esbuild");

const target = `o.jsx("div",{className:"space-y-3.5 my-1",children:Be&&o.jsxs(ce.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},className:"bg-gradient-to-r from-rose-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-lg relative overflow-hidden animate-pulse",style:{animationDuration:"3s"},children:[o.jsx("div",{className:"absolute -right-6 -bottom-6 text-rose-500/10 pointer-events-none transform rotate-45",children:o.jsx(Mo,{size:90})}),o.jsxs("div",{className:"flex items-center gap-2.5 text-red-600 mb-2 relative z-10",children:[o.jsx("div",{className:"w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 shadow-md",children:o.jsx(Mo,{size:15,strokeWidth:3,className:"animate-bounce"})}),o.jsx("span",{className:"font-extrabold text-xs uppercase tracking-wider",children:"গুরুত্বপূর্ণ নিরাপত্তা সতর্কবার্তা"})]}),o.jsxs("p",{className:"text-red-950 font-black text-xs leading-relaxed text-justify relative z-10",children:["পেমেন্ট করার সময় ভালোভাবে নাম্বার দেখে পেমেন্ট করবেন। অন্য নাম্বারে টাকা চলে গেলে ",o.jsx("span",{className:"text-red-600 font-extrabold underline decoration-2 decoration-red-600 underline-offset-2",children:"sn777.top"})," কোনো দায়ভার নিবে না। যারা ৫০০ টাকার নিচে ডিপোজিট করতে চাচ্ছেন তাদের অনেক সময় সমস্যা হতে পারে কারণ ProPay গেটের সমস্যার কারণে অনেক সময় ৫০০ টাকা নিচে এমাউন্ট দিলে মেনটেনিস লেখা আছে যদি এটা লেখা আসে তাহলে ৫০০ টাকা বা ৫০০ টাকার উপরে ডিপোজিট করার চেষ্টা করবেন দেয়ার সমস্যা হবে না"]})]})})`;

const filesToPatch = [
  "dist/assets/index-sn777-v8.js",
  "dist_backup/assets/index-sn777-v8.js",
  "dist/assets/index-sn777-v7.js",
  "dist_backup/assets/index-sn777-v7.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js",
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

filesToPatch.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  if (code.includes(target)) {
    code = code.replace(target, "null");
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[REMOVED WARNING] Successfully removed warning in ${file}`);
  } else {
    console.log(`Target not found in ${file}`);
  }
});

// Create index-sn777-v9.js from the patched v8
fs.copyFileSync("dist/assets/index-sn777-v8.js", "dist/assets/index-sn777-v9.js");
fs.copyFileSync("dist_backup/assets/index-sn777-v8.js", "dist_backup/assets/index-sn777-v9.js");
console.log("Created index-sn777-v9.js in dist and dist_backup");
