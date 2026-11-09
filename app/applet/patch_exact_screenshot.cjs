const fs = require("fs");
const esbuild = require("esbuild");

const jsPath = "dist_backup/assets/index-CUhzlpga-v3.js";
let js = fs.readFileSync(jsPath, "utf8");

const pEnd = js.indexOf(",o.jsx(tn,{children:Rt&&");
const pKn = js.indexOf("children:kn&&");
const p0 = pKn - "o.jsx(tn,{".length;

if (p0 === -1 || pEnd === -1) {
  console.error("Indices not found:", { p0, pEnd });
  process.exit(1);
}

console.log(`Found exact modal element from ${p0} to ${pEnd}`);

// Create exact 1:1 match to screenshot Gallery_1786860768678.png
// Card features:
// - Card container: bg-[#0e1626] border border-[#1b283f] rounded-[1.75rem] p-5 sm:p-6 shadow-2xl
// - Header inside card:
//   - Left: "USERNAME" (text-[#627d98] text-[12px] font-black uppercase tracking-wider) -> "Suya120" (text-[#1ca0f6] text-[17px] font-black)
//   - Right: "BALANCE" (text-[#627d98] text-[12px] font-black uppercase tracking-wider text-right) -> "৳7,567" (text-[#00e5a3] text-[17px] font-black text-right)
// - Row 1 (ORDER ID): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-[#e2e8f0] text-[14px] font-bold (ORD1786860202761)
// - Row 2 (AMOUNT): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-white text-[16px] font-black (550.00)
// - Row 3 (DOMAIN): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-[#00c9a7] text-[12px] font-bold border border-[#00c9a7] rounded-full px-3 py-0.5 bg-[#00c9a7]/10 (sn777.site)
// - Row 4 (PAY TYPE): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-white text-[14px] font-bold (Bkash)
// - Row 5 (STATUS): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right:
//     Cancelled: text-[#ff3366] text-[15px] font-extrabold flex items-center gap-1.5 ("❌ Cancelled")
//     Success: text-[#00e5a3] text-[15px] font-extrabold flex items-center gap-1.5 ("✓ Success")
//     Pending: text-[#fbbf24] text-[15px] font-extrabold flex items-center gap-1.5 ("⏳ Pending")
// - Row 6 (DATE): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-[#00d2b4] text-[13px] font-medium (Aug 16, 2026, 12:03:22 PM)
// - Row 7 (LINK): left text-[#00d2b4] text-[13px] font-black uppercase tracking-wider -> right text-[#00d2b4] text-[14px] font-medium (No Action)
// - Separators: subtle dashed border-b border-dashed border-[#18263a] between rows

const newFullModal = `o.jsx(tn,{children:kn&&o.jsxs("div",{className:"fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4 font-sans select-none",children:[o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>Mt(!1),className:"absolute inset-0 bg-black/80 backdrop-blur-md"}),o.jsxs(ce.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},exit:{scale:.95,opacity:0,y:20},className:"bg-[#080d1a] border border-[#1b283f] w-full max-w-[480px] md:max-w-[580px] h-[90vh] md:h-[84vh] rounded-[2.25rem] overflow-hidden shadow-2xl relative z-10 flex flex-col",children:[o.jsxs("header",{className:"bg-[#0e1626] border-b border-[#1b283f] text-white px-6 py-4 flex items-center justify-between shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-2.5",children:[o.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-[#00d2b4] shadow-[0_0_8px_#00d2b4]"}),o.jsx("h2",{className:"text-base md:text-lg font-black uppercase tracking-wider text-[#00d2b4]",children:"TRANSACTION RECORD"})]}),o.jsx("button",{onClick:()=>Mt(!1),className:"w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95",children:o.jsx(Ts,{size:18})})]}),o.jsx("div",{className:"flex bg-[#0a1120] px-4 py-3 gap-2 border-b border-[#1b283f]",children:[{id:"all",label:"ALL"},{id:"deposit",label:"DEPOSIT"},{id:"withdraw",label:"WITHDRAW"}].map(E=>o.jsx("button",{key:E.id,onClick:()=>hi(E.id),className:"flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider "+(gn===E.id?"bg-[#00d2b4]/20 text-[#00d2b4] border border-[#00d2b4]/50 shadow-sm":"text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"),children:E.label}))}),o.jsx("div",{className:"flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar bg-[#080d1a]",children:xn.filter(E=>gn==="all"||E.type===gn).length>0?xn.filter(E=>gn==="all"||E.type===gn).map((E,L)=>{const uName=ve.username||E.username||"Suya120",uBal="৳"+(parseFloat(String(ve.balance||"7567").replace(/,/g,""))).toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",").replace(".00",""),ordId=E.orderId||E.order_no||E.id||("ORD"+(1786860000000+L*1234567)),rawAmt=Number(E.displayAmount||E.amount||550),fmtAmt=rawAmt.toFixed(2),payType=E.method||E.paymentMethod||"Bkash",isCancelled=E.status==="rejected"||E.status==="cancelled"||E.status==="failed"||(E.description&&E.description.includes("বাতিল")),isApproved=E.status==="approved"||E.status==="success",dObj=E.timestamp?new Date(E.timestamp):new Date(),dateStr=dObj.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+", "+dObj.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true});return o.jsxs("div",{className:"bg-[#0e1626] border border-[#1b283f] rounded-[1.75rem] p-5 sm:p-6 shadow-xl flex flex-col gap-3 font-sans relative overflow-hidden",children:[o.jsxs("div",{className:"flex items-center justify-between pb-2",children:[o.jsxs("div",{className:"flex flex-col gap-0.5",children:[o.jsx("span",{className:"text-[12px] font-black text-[#627d98] uppercase tracking-wider",children:"USERNAME"}),o.jsx("span",{className:"text-[17px] font-black text-[#1ca0f6] tracking-wide",children:uName})]}),o.jsxs("div",{className:"flex flex-col gap-0.5 text-right",children:[o.jsx("span",{className:"text-[12px] font-black text-[#627d98] uppercase tracking-wider",children:"BALANCE"}),o.jsx("span",{className:"text-[17px] font-black text-[#00e5a3] tracking-wide",children:uBal})]})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"ORDER ID"}),o.jsx("span",{className:"font-bold text-[#e2e8f0] tracking-wider text-[14px] select-all",children:ordId})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"AMOUNT"}),o.jsx("span",{className:"font-black text-white text-[17px] tracking-wide",children:fmtAmt})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"DOMAIN"}),o.jsx("span",{className:"text-[12px] font-bold text-[#00c9a7] border border-[#00c9a7] bg-[#00c9a7]/10 px-3.5 py-0.5 rounded-full tracking-wider",children:"sn777.site"})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"PAY TYPE"}),o.jsx("span",{className:"font-bold text-[#e2e8f0] text-[15px]",children:payType})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"STATUS"}),isCancelled?o.jsxs("span",{className:"font-black text-[#ff3366] flex items-center gap-1.5 text-[15px]",children:[o.jsx("span",{className:"text-base font-bold",children:"❌"})," Cancelled"]}):isApproved?o.jsxs("span",{className:"font-black text-[#00e5a3] flex items-center gap-1.5 text-[15px]",children:[o.jsx("span",{className:"text-base font-bold",children:"✓"})," Success"]}):o.jsxs("span",{className:"font-black text-[#fbbf24] flex items-center gap-1.5 text-[15px]",children:[o.jsx("span",{className:"text-base font-bold",children:"⏳"})," Pending"]})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5 pb-0.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"DATE"}),o.jsx("span",{className:"font-medium text-[#00d2b4] text-[13px]",children:dateStr})]}),o.jsxs("div",{className:"flex items-center justify-between border-t border-dashed border-[#1a293d] pt-2.5",children:[o.jsx("span",{className:"font-black text-[#00d2b4] uppercase tracking-wider text-[13px]",children:"LINK"}),o.jsx("span",{className:"font-medium text-[#00d2b4] text-[14px]",children:"No Action"})]})]},String(E.id||"tx")+"-"+L)}):o.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center opacity-30 p-10",children:[o.jsx(Y2,{size:56,className:"mb-3 text-[#00d2b4]"}),o.jsx("p",{className:"font-black text-sm uppercase tracking-widest text-slate-400",children:"NO RECORDS FOUND"})]})})]})]})})`

// Validate with esbuild
try {
  esbuild.transformSync("function test() { return (" + newFullModal + "); }", { loader: "js" });
  console.log("Syntactic check PASSED successfully!");
} catch (e) {
  console.error("Syntax validation error:", e);
  process.exit(1);
}

const updatedJs = js.substring(0, p0) + newFullModal + js.substring(pEnd);
fs.writeFileSync(jsPath, updatedJs, "utf8");

if (fs.existsSync("dist/assets/index-CUhzlpga-v3.js")) {
  fs.writeFileSync("dist/assets/index-CUhzlpga-v3.js", updatedJs, "utf8");
}

console.log("SUCCESSFULLY APPLIED EXACT 1:1 SCREENSHOT DESIGN!");
