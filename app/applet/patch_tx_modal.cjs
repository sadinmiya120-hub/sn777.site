const fs = require("fs");
const esbuild = require("esbuild");

const jsPath = "dist_backup/assets/index-CUhzlpga-v3.js";
let js = fs.readFileSync(jsPath, "utf8");

const startStr = 'kn&&o.jsxs("div",{className:"fixed inset-0 z-[260]';
const p1 = js.indexOf(startStr);
if (p1 === -1) {
  console.error("Could not find start string:", startStr);
  process.exit(1);
}

const endStr = ')}),o.jsx(tn,{children:Rt&&';
const p2 = js.indexOf(endStr, p1);
if (p2 === -1) {
  console.error("Could not find end string:", endStr);
  process.exit(1);
}

console.log(`Found modal chunk from ${p1} to ${p2}`);

const newModalCode = `kn&&o.jsxs("div",{className:"fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4",children:[o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>Mt(!1),className:"absolute inset-0 bg-black/75 backdrop-blur-sm"}),o.jsxs(ce.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},exit:{scale:.95,opacity:0,y:20},className:"bg-[#f0f4f8] w-full max-w-[440px] md:max-w-[620px] h-[88vh] md:h-[75vh] rounded-[2.25rem] overflow-hidden shadow-2xl relative z-10 flex flex-col font-sans",children:[o.jsxs("header",{className:"bg-[#005ba1] text-white px-5 py-4 flex items-center justify-between shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-2.5",children:[o.jsx(Y2,{size:22,className:"text-yellow-400"}),o.jsx("h2",{className:"text-lg md:text-xl font-black italic uppercase tracking-tight",children:"ট্রানজেকশন রেকর্ড"})]}),o.jsx("button",{onClick:()=>Mt(!1),className:"w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all active:scale-95",children:o.jsx(Ts,{size:18})})]}),o.jsx("div",{className:"flex bg-white px-3 py-2.5 gap-2 border-b border-slate-200/80 shadow-xs",children:[{id:"all",label:"সবগুলো"},{id:"deposit",label:"ডিপোজিট"},{id:"withdraw",label:"উইথড্র"}].map(E=>o.jsx("button",{key:E.id,onClick:()=>hi(E.id),className:\`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wide \${gn===E.id?"bg-[#005ba1] text-white shadow-sm":"text-slate-500 hover:text-slate-800 hover:bg-slate-50"}\`,children:E.label}))}),o.jsx("div",{className:"flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar bg-[#f0f4f8]",children:xn.filter(E=>gn==="all"||E.type===gn).length>0?xn.filter(E=>gn==="all"||E.type===gn).map((E,L)=>o.jsxs("div",{className:"bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 transition-all",children:[o.jsxs("div",{className:"flex items-center gap-3 min-w-0 flex-1",children:[o.jsx("div",{className:"w-11 h-11 rounded-2xl bg-[#eef2f6] shrink-0 flex items-center justify-center text-slate-400 font-bold",children:E.type==="deposit"?o.jsx(Y2,{size:20,className:"text-[#005ba1]"}):o.jsx(W2,{size:20,className:"rotate-180 text-rose-500"})}),o.jsxs("div",{className:"min-w-0 flex-1",children:[o.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[o.jsx("h4",{className:"text-slate-900 font-black text-sm uppercase tracking-tight",children:E.type==="deposit"?"ডিপোজিট":"উইথড্র"}),o.jsx("span",{className:\`text-[10px] px-2.5 py-0.5 rounded-full font-black text-white \${(E.status==="approved"||E.status==="success")?"bg-[#00a859]":E.status==="pending"?"bg-[#f59e0b]":"bg-[#e62e2d]"} shadow-xs leading-tight\`,children:(E.status==="approved"||E.status==="success")?"সাকসেসফুল":E.status==="pending"?"পেন্ডিং":"ব্যর্থ"})]}),o.jsx("p",{className:"text-slate-400 text-[11px] font-semibold",children:E.timestamp?new Date(E.timestamp).toLocaleString("en-US",{month:"numeric",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}):new Date().toLocaleString()}),o.jsx("p",{className:"text-slate-500 text-[11px] font-normal leading-relaxed mt-0.5 line-clamp-2",children:E.description||(E.type==="deposit"?((E.status==="approved"||E.status==="success")?"ডিপোজিট রিকোয়েস্ট "+(E.displayAmount||E.amount||550)+" টাকা (ডিপোজিট গিফট কার্ড প্যাকেজ: ১০০% বোনাস সহ মোট "+(Number(E.displayAmount||E.amount||550)*2)+" টাকা)":E.status==="pending"?"ডিপোজিট রিকোয়েস্ট "+(E.displayAmount||E.amount||550)+" টাকা যাচাই করা হচ্ছে":"ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে।"):"উইথড্র রিকোয়েস্ট")})]})]}),o.jsx("div",{className:"text-right shrink-0 pl-2",children:o.jsxs("span",{className:\`text-base sm:text-lg font-black tracking-tight \${E.type==="deposit"?"text-[#00a859]":"text-[#e62e2d]"}\`,children:[E.type==="deposit"?"+":"-","৳",E.displayAmount||E.amount||0]})})]},String(E.id||"tx")+"-"+L)):o.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center opacity-40 p-10",children:[o.jsx(Y2,{size:56,className:"mb-3 text-slate-400"}),o.jsx("p",{className:"font-black text-sm uppercase tracking-widest text-slate-500",children:"এখনো কোনো রেকর্ড নেই"})]})})]})]}`;

// Check if valid JS
try {
  esbuild.transformSync("function test() { return " + newModalCode + "; }", { loader: "js" });
  console.log("Syntactic check PASSED!");
} catch (e) {
  console.error("Syntax validation error:", e);
  process.exit(1);
}

const updatedJs = js.substring(0, p1) + newModalCode + js.substring(p2);
fs.writeFileSync(jsPath, updatedJs, "utf8");

if (fs.existsSync("dist/assets/index-CUhzlpga-v3.js")) {
  fs.writeFileSync("dist/assets/index-CUhzlpga-v3.js", updatedJs, "utf8");
}

console.log("Successfully updated index-CUhzlpga-v3.js with screenshot-matching transaction record modal!");
