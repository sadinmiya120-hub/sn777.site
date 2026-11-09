const acorn = require("acorn");
const esbuild = require("esbuild");

// Test the JSX with style objects
const testCode = `
const paymentJsx = xs?o.jsx(ce.div,{initial:{opacity:0,scale:.98},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.98},className:"min-h-screen text-slate-800",style:{backgroundColor:"#ffffff"},children:` +
  `o.jsxs("div",{className:"w-full max-w-md mx-auto min-h-screen pb-16 flex flex-col font-sans",style:{backgroundColor:"#ffffff"},children:[` +
    // Top green bar (#00684a)
    `o.jsxs("div",{style:{backgroundColor:"#00684a",color:"#ffffff",padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"},children:[` +
      `o.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[` +
        `o.jsxs("div",{children:[` +
          `o.jsxs("div",{style:{fontSize:"26px",fontWeight:"bold",color:"#ffffff",lineHeight:"1.2"},children:["BDT ",parseFloat(Is||ys||"306").toFixed(2)]}),` +
          `o.jsx("div",{style:{fontSize:"13px",fontWeight:"500",color:"rgba(255,255,255,0.95)",marginTop:"3px"},children:"কম বা বেশি টাকা পাঠাবেন না"})` +
        `]}),` +
        `o.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px"},children:[` +
          `o.jsx("button",{type:"button",onClick:()=>Ls(!1),style:{backgroundColor:"#004e36",color:"#ffffff",fontSize:"11px",fontWeight:"bold",padding:"4px 10px",borderRadius:"4px",border:"none",textTransform:"uppercase",letterSpacing:"0.5px",cursor:"pointer"},children:"PAY SERVICE"}),` +
          `o.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[` +
            `o.jsx("span",{style:{backgroundColor:"#ffffff",color:"#00684a",fontSize:"11px",fontWeight:"bold",padding:"2px 8px",borderRadius:"4px"},children:"EN"}),` +
            `o.jsx("span",{style:{backgroundColor:"#ffffff",color:"#00684a",fontSize:"11px",fontWeight:"bold",padding:"2px 8px",borderRadius:"4px"},children:"বাংলা"})` +
          `]})` +
        `]})` +
      `]})` +
    `]}),` +

    // Pink warning notice card (2 lines)
    `o.jsx("div",{style:{padding:"14px 16px 10px 16px"},children:` +
      `o.jsxs("div",{style:{backgroundColor:"#fff5f5",border:"1px solid #fed7d7",borderRadius:"8px",padding:"10px 14px",textAlign:"center",color:"#d1293d",fontWeight:"bold",fontSize:"13.5px",lineHeight:"1.4"},children:[` +
        `"আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT ",parseFloat(Is||ys||"306").toFixed(2),"),",` +
        `o.jsx("br",{}),` +
        `"আপনি ক্রেডিট পেতে সক্ষম হবেন না।"` +
      `]})` +
    `}),` +

    // Brand banner (Bkash / Nagad / Rocket) - full width
    `o.jsxs("div",{style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",backgroundColor:Be==="nagad"?"#eb1c24":Be==="rocket"?"#8c1569":"#941f6e",color:"#ffffff"},children:[` +
      `o.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"14px"},children:[` +
        `o.jsx("div",{style:{width:"52px",height:"52px",backgroundColor:"#ffffff",borderRadius:"14px",display:"flex",alignItems:"center",justifyContent:"center",padding:"6px",flexShrink:0,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"},children:` +
          `o.jsx("img",{src:(Bi.find(E=>E.id===Be))?.logo||Bi[0].logo,alt:Be,style:{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}})` +
        `}),` +
        `o.jsxs("div",{style:{fontWeight:"bold",fontSize:"19px",color:"#ffffff",letterSpacing:"0.3px"},children:[` +
          `(Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash")+" Deposit"` +
        `]})` +
      `]}),` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),style:{background:"none",border:"none",color:"rgba(255,255,255,0.85)",cursor:"pointer",padding:"4px"},children:o.jsx(Ts,{size:20})})` +
    `]}),` +

    // Instructional text
    `o.jsx("div",{style:{padding:"16px 16px 8px 16px"},children:` +
      `o.jsxs("p",{style:{fontSize:"14px",color:"#1e293b",lineHeight:"1.5",margin:0},children:[` +
        `"নিচে দেওয়া ",` +
        `o.jsx("strong",{style:{fontWeight:"bold",color:"#0f172a"},children:Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash"}),` +
        `" নাম্বারে নির্দিষ্ট টাকা জমা করুন। অনুগ্রহ করে সঠিক ",` +
        `o.jsx("span",{children:"type"}),` +
        `" নির্বাচন করে নির্দেশনা অনুসরণ করুন।"` +
      `]})` +
    `}),` +

    // Wallet No label line with red *
    `o.jsxs("div",{style:{padding:"8px 16px 6px 16px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"},children:[` +
      `o.jsx("span",{style:{fontWeight:"bold",color:"#0f172a",fontSize:"14px"},children:"Wallet No"}),` +
      `o.jsx("span",{style:{fontSize:"12.5px",color:"#64748b"},children:"এই নাম্বারে শুধুমাত্র Personal গ্রহণ করা হয়"}),` +
      `o.jsx("span",{style:{color:"#ef4444",fontWeight:"bold",fontSize:"14px"},children:"*"}),` +
    `]}),` +

    // Send Money Only Alert Card
    `o.jsx("div",{style:{padding:"0 16px 12px 16px"},children:` +
      `o.jsx("div",{style:{backgroundColor:"#fff5f5",borderLeft:"4px solid #d81b60",borderTop:"1px solid #fed7d7",borderRight:"1px solid #fed7d7",borderBottom:"1px solid #fed7d7",borderRadius:"0 6px 6px 0",padding:"10px 14px"},children:` +
        `o.jsxs("div",{style:{color:"#c2185b",fontWeight:"bold",fontSize:"13px"},children:[` +
          `"এই ",Be==="bkash"?"বিকাশ":Be==="nagad"?"নগদ":Be==="rocket"?"রকেট":"বিকাশ"," Personal নাম্বারে শুধুমাত্র সেন্ড মানি গ্রহণ করা হয়।"` +
        `]})` +
      `})` +
    `}),` +

    // Number Box with Mint-Green Copy Button
    `o.jsx("div",{style:{padding:"0 16px 14px 16px"},children:` +
      `o.jsxs("div",{style:{backgroundColor:"#f0f4f8",border:"1px solid #cbd5e1",borderRadius:"12px",padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[` +
        `o.jsx("span",{style:{fontSize:"19px",fontWeight:"bold",color:"#0f172a",letterSpacing:"0.5px",fontFamily:"monospace, sans-serif",userSelect:"all"},children:Ys}),` +
        `o.jsxs("button",{type:"button",onClick:()=>Z(Ys,"agent"),style:{display:"flex",alignItems:"center",gap:"6px",backgroundColor:"#c6f6d5",color:"#065f46",padding:"8px 16px",borderRadius:"8px",fontWeight:"bold",fontSize:"13.5px",border:"none",cursor:"pointer"},children:[` +
          `o.jsx(ih,{size:16}),` +
          `o.jsx("span",{children:T==="agent"?"কপি হয়েছে":"কপি"})` +
        `]})` +
      `]})` +
    `}),` +

    // TrxID Input Label
    `o.jsxs("div",{style:{padding:"6px 16px 6px 16px",display:"flex",alignItems:"center",gap:"4px"},children:[` +
      `o.jsx("span",{style:{fontWeight:"bold",color:"#0f172a",fontSize:"14.5px"},children:"ক্যাশআউট / সেন্ড মানি TrxID নম্বরটি লিখুন"}),` +
      `o.jsx("span",{style:{color:"#ef4444",fontWeight:"bold",fontSize:"14px"},children:"*"}),` +
    `]}),` +

    // TrxID Input Field with Coral/Red Border
    `o.jsx("div",{style:{padding:"0 16px 14px 16px"},children:` +
      `o.jsx("input",{type:"text",value:oi,onChange:E=>Xt(E.target.value),style:{width:"100%",boxSizing:"border-box",backgroundColor:"#ffffff",border:"1.5px solid #f87171",borderRadius:"10px",height:"50px",padding:"0 16px",fontWeight:"bold",color:"#1e293b",fontSize:"15px",outline:"none",letterSpacing:"0.5px",textTransform:"uppercase"},placeholder:"TrxID লিখুন"})` +
    `}),` +

    // Warning Notice Box
    `o.jsx("div",{style:{padding:"0 16px 16px 16px"},children:` +
      `o.jsxs("div",{style:{backgroundColor:"#fff5f5",border:"1px solid #fed7d7",borderRadius:"10px",padding:"12px 16px",textAlign:"center"},children:[` +
        `o.jsx("div",{style:{color:"#1e293b",fontWeight:"bold",fontSize:"13.5px",marginBottom:"4px"},children:"সতর্কতা:"}),` +
        `o.jsx("div",{style:{color:"#dc2626",fontWeight:"bold",fontSize:"12.5px",lineHeight:"1.4"},children:"লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় ক্রেডিট ব্যর্থ হবে!!"})` +
      `]})` +
    `}),` +

    // Submit Button (জমা দিন)
    `o.jsx("div",{style:{padding:"0 16px 12px 16px"},children:` +
      `o.jsx("button",{type:"button",onClick:v,disabled:Ee,style:{width:"100%",boxSizing:"border-box",backgroundColor:Be==="nagad"?"#eb1c24":Be==="rocket"?"#8c1569":"#c2185b",color:"#ffffff",height:"50px",borderRadius:"9999px",fontWeight:"bold",fontSize:"18px",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 2px 4px rgba(0,0,0,0.1)"},children:` +
        `Ee?o.jsx(pr,{size:20,className:"animate-spin"}):"জমা দিন"` +
      `})` +
    `}),` +

    // Close button
    `o.jsx("div",{style:{textAlign:"center",padding:"4px 0 20px 0"},children:` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),style:{background:"none",border:"none",fontSize:"12px",fontWeight:"bold",color:"#64748b",textDecoration:"underline",cursor:"pointer"},children:"ফিরে যান"})` +
    `})` +
  `]})` +
`:"not-xs";
`;

console.log("Parsing with acorn...");
acorn.parse(testCode, { ecmaVersion: 2020 });
console.log("Acorn PASSED!");

esbuild.transformSync(testCode, { loader: "js" });
console.log("esbuild PASSED!");
