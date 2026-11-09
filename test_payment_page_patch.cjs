const fs = require("fs");
const acorn = require("acorn");
const esbuild = require("esbuild");

let code = fs.readFileSync("dist/assets/index-sn777-v5.js", "utf8");

// 1. Fix v check
let vOldCheck = `if(!["binance","usdt","usdterc20"].includes(Be)&&(!Bn||!oi)){Fe("অনুগ্রহ করে প্রেরকের নম্বর এবং ট্রানজ্যাকশন আইডি প্রদান করুন।"),Je(!0);return}`;
let vNewCheck = `if(!["binance","usdt","usdterc20"].includes(Be)&&!oi){Fe("অনুগ্রহ করে ট্রানজ্যাকশন আইডি (TrxID) লিখুন।");Je(!0);return}if(!Bn){Bn=(ve&&(ve.phone||ve.username))||(gt.currentUser&&gt.currentUser.phoneNumber)||"01700000000"}`;
if (code.includes(vOldCheck)) {
  code = code.replace(vOldCheck, vNewCheck);
  console.log("Fixed v check for TrxID only");
}

// 2. Replace payment-screen (xs ? ... : ...)
let pEnd = code.indexOf(`},"payment-screen")`);
if (pEnd === -1) {
  console.error("Could not find payment-screen end");
  process.exit(1);
}
let pStart = code.lastIndexOf(`xs?`, pEnd);
if (pStart === -1) {
  console.error("Could not find xs? start");
  process.exit(1);
}

console.log("Found payment-screen from", pStart, "to", pEnd);

let exactScreenshotPaymentScreen = `xs?o.jsx(ce.div,{initial:{opacity:0,scale:.98},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.98},className:"bg-white min-h-screen text-slate-800",children:` +
  `o.jsxs("div",{className:"w-full max-w-md mx-auto bg-white min-h-screen pb-16 flex flex-col font-sans",children:[` +
    // Top green bar (#00684a)
    `o.jsxs("div",{className:"bg-[#00684a] text-white px-4 py-3.5 shadow-sm",children:[` +
      `o.jsxs("div",{className:"flex justify-between items-center",children:[` +
        `o.jsxs("div",{children:[` +
          `o.jsxs("div",{className:"text-[26px] font-bold tracking-tight leading-tight text-white",children:["BDT ",parseFloat(Is||ys||"306").toFixed(2)]}),` +
          `o.jsx("div",{className:"text-[13px] font-medium mt-1 text-white/95",children:"কম বা বেশি টাকা পাঠাবেন না"})` +
        `]}),` +
        `o.jsxs("div",{className:"flex flex-col items-end gap-1.5",children:[` +
          `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"bg-[#004e36] hover:bg-[#00422d] text-white text-[11px] font-bold px-3 py-1 rounded shadow-xs tracking-wider uppercase active:scale-95 transition-all",children:"PAY SERVICE"}),` +
          `o.jsxs("div",{className:"flex items-center gap-1.5",children:[` +
            `o.jsx("span",{className:"bg-white text-[#00684a] text-[11px] font-bold px-2 py-0.5 rounded shadow-xs select-none",children:"EN"}),` +
            `o.jsx("span",{className:"bg-white text-[#00684a] text-[11px] font-bold px-2 py-0.5 rounded shadow-xs select-none",children:"বাংলা"})` +
          `]})` +
        `]})` +
      `]})` +
    `]}),` +

    // Pink warning notice card (2 lines)
    `o.jsx("div",{className:"px-4 pt-3.5 pb-2.5",children:` +
      `o.jsxs("div",{className:"bg-[#fff5f5] border border-[#fed7d7] rounded-lg py-2.5 px-3.5 text-center text-[#d1293d] font-bold text-[13.5px] leading-snug shadow-xs",children:[` +
        `"আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT ",parseFloat(Is||ys||"306").toFixed(2),"),",` +
        `o.jsx("br",{}),` +
        `"আপনি ক্রেডিট পেতে সক্ষম হবেন না।"` +
      `]})` +
    `}),` +

    // Brand banner (Bkash / Nagad / Rocket) - full width
    `o.jsxs("div",{className:\`w-full flex items-center justify-between px-4 py-2.5 \${Be==="nagad"?"bg-[#eb1c24]":Be==="rocket"?"bg-[#8c1569]":"bg-[#941f6e]"} text-white shadow-xs\`,children:[` +
      `o.jsxs("div",{className:"flex items-center gap-3.5",children:[` +
        `o.jsx("div",{className:"w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0 shadow-sm relative overflow-hidden",children:` +
          `o.jsx("img",{src:(Bi.find(E=>E.id===Be))?.logo||Bi[0].logo,alt:Be,className:"w-full h-full object-contain"})` +
        `}),` +
        `o.jsxs("div",{className:"font-bold text-[19px] text-white tracking-wide",children:[` +
          `(Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash")+" Deposit"` +
        `]})` +
      `]}),` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"text-white/80 hover:text-white p-1",children:o.jsx(Ts,{size:20})})` +
    `]}),` +

    // Instructional text
    `o.jsx("div",{className:"px-4 pt-4 pb-2",children:` +
      `o.jsxs("p",{className:"text-[14px] text-slate-800 leading-relaxed",children:[` +
        `"নিচে দেওয়া ",` +
        `o.jsx("strong",{className:"font-bold text-slate-900",children:Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash"}),` +
        `" নাম্বারে নির্দিষ্ট টাকা জমা করুন। অনুগ্রহ করে সঠিক ",` +
        `o.jsx("span",{className:"font-normal",children:"type"}),` +
        `" নির্বাচন করে নির্দেশনা অনুসরণ করুন।"` +
      `]})` +
    `}),` +

    // Wallet No label line with red *
    `o.jsxs("div",{className:"px-4 pt-2 pb-1.5 flex items-center gap-1.5 flex-wrap",children:[` +
      `o.jsx("span",{className:"font-bold text-slate-900 text-[14px]",children:"Wallet No"}),` +
      `o.jsx("span",{className:"text-[12.5px] font-normal text-slate-500",children:"এই নাম্বারে শুধুমাত্র Personal গ্রহণ করা হয়"}),` +
      `o.jsx("span",{className:"text-red-500 font-bold text-[14px]",children:"*"}),` +
    `]}),` +

    // Send Money Only Alert Card
    `o.jsx("div",{className:"px-4 pb-3",children:` +
      `o.jsx("div",{className:"bg-[#fff5f5] border-l-[4px] border-[#d81b60] border-y border-r border-pink-100/60 rounded-r-md py-2.5 px-3.5 shadow-xs",children:` +
        `o.jsxs("div",{className:"text-[#c2185b] font-bold text-[13px]",children:[` +
          `"এই ",Be==="bkash"?"বিকাশ":Be==="nagad"?"নগদ":Be==="rocket"?"রকেট":"বিকাশ"," Personal নাম্বারে শুধুমাত্র সেন্ড মানি গ্রহণ করা হয়।"` +
        `]})` +
      `})` +
    `}),` +

    // Number Box with Mint-Green Copy Button
    `o.jsx("div",{className:"px-4 pb-3.5",children:` +
      `o.jsxs("div",{className:"bg-[#f0f4f8] border border-slate-200/90 rounded-xl py-2 px-4 flex items-center justify-between shadow-xs",children:[` +
        `o.jsx("span",{className:"text-[19px] font-bold text-slate-900 tracking-wider font-mono select-all",children:Ys}),` +
        `o.jsxs("button",{type:"button",onClick:()=>Z(Ys,"agent"),className:"flex items-center gap-1.5 bg-[#c6f6d5] hover:bg-[#bbf7d0] text-[#065f46] px-4 py-2 rounded-xl font-bold text-[13.5px] active:scale-95 transition-all shadow-xs shrink-0",children:[` +
          `o.jsx(ih,{size:16,className:"stroke-[2.2]"}),` +
          `o.jsx("span",{children:T==="agent"?"কপি হয়েছে":"কপি"})` +
        `]})` +
      `]})` +
    `}),` +

    // TrxID Input Label
    `o.jsxs("div",{className:"px-4 pt-1 pb-1.5 flex items-center gap-1",children:[` +
      `o.jsx("span",{className:"font-bold text-slate-900 text-[14.5px]",children:"ক্যাশআউট / সেন্ড মানি TrxID নম্বরটি লিখুন"}),` +
      `o.jsx("span",{className:"text-red-500 font-bold text-[14px]",children:"*"}),` +
    `]}),` +

    // TrxID Input Field with Coral/Red Border
    `o.jsx("div",{className:"px-4 pb-3.5",children:` +
      `o.jsx("input",{type:"text",value:oi,onChange:E=>Xt(E.target.value),className:"w-full bg-white border-[1.5px] border-[#f87171] focus:border-red-500 rounded-xl h-[50px] px-4 font-bold text-slate-800 text-[15px] outline-none shadow-xs transition-all placeholder:text-gray-400 placeholder:font-normal uppercase tracking-wide",placeholder:"TrxID লিখুন"})` +
    `}),` +

    // Warning Notice Box
    `o.jsx("div",{className:"px-4 pb-4",children:` +
      `o.jsxs("div",{className:"bg-[#fff5f5] border border-[#fed7d7] rounded-xl py-3 px-4 text-center space-y-1 shadow-xs",children:[` +
        `o.jsx("div",{className:"text-slate-800 font-bold text-[13.5px]",children:"সতর্কতা:"}),` +
        `o.jsx("div",{className:"text-[#dc2626] font-bold text-[12.5px] leading-snug",children:"লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় ক্রেডিট ব্যর্থ হবে!!"})` +
      `]})` +
    `}),` +

    // Submit Button (জমা দিন)
    `o.jsx("div",{className:"px-4 pb-4 pt-1",children:` +
      `o.jsx("button",{type:"button",onClick:v,disabled:Ee,className:\`w-full \${Be==="nagad"?"bg-[#eb1c24] hover:bg-[#d0171e]":Be==="rocket"?"bg-[#8c1569] hover:bg-[#781058]":"bg-[#c2185b] hover:bg-[#ad1457]"} active:scale-[0.99] text-white h-[50px] rounded-full font-bold text-[18px] shadow-sm flex items-center justify-center gap-2 transition-all\`,children:` +
        `Ee?o.jsx(pr,{size:20,className:"animate-spin"}):"জমা দিন"` +
      `})` +
    `}),` +

    // Close button
    `o.jsx("div",{className:"flex items-center justify-center pt-1 pb-4",children:` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"text-xs font-bold text-slate-400 hover:text-slate-700 underline",children:"ফিরে যান"})` +
    `})` +
  `]})`;

let patchedCode = code.substring(0, pStart) + exactScreenshotPaymentScreen + code.substring(pEnd);

console.log("Validating syntax with acorn...");
acorn.parse(patchedCode, { ecmaVersion: 2020 });
console.log("Acorn check PASSED!");

esbuild.transformSync(patchedCode, { loader: "js" });
console.log("esbuild check PASSED!");
