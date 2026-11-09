const acorn = require("acorn");
const esbuild = require("esbuild");

let exactScreenshotPaymentScreen = `xs?o.jsx(ce.div,{initial:{opacity:0,scale:.98},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.98},className:"sn-pay-page-wrapper",style:{backgroundColor:"#ffffff",minHeight:"100vh"},children:` +
  `o.jsxs("div",{className:"sn-pay-card",style:{backgroundColor:"#ffffff"},children:[` +
    // Top green bar (#00684a)
    `o.jsxs("div",{className:"sn-pay-topbar",style:{backgroundColor:"#00684a",color:"#ffffff"},children:[` +
      `o.jsxs("div",{className:"sn-pay-topbar-row",children:[` +
        `o.jsxs("div",{children:[` +
          `o.jsxs("div",{className:"sn-pay-amount-title",style:{color:"#ffffff"},children:["BDT ",parseFloat(Is||ys||"306").toFixed(2)]}),` +
          `o.jsx("div",{className:"sn-pay-amount-desc",style:{color:"#ffffff"},children:"কম বা বেশি টাকা পাঠাবেন না"})` +
        `]}),` +
        `o.jsxs("div",{className:"sn-pay-topbar-right",children:[` +
          `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"sn-pay-service-btn",style:{backgroundColor:"#004e36",color:"#ffffff"},children:"PAY SERVICE"}),` +
          `o.jsxs("div",{className:"sn-pay-lang-container",children:[` +
            `o.jsx("span",{className:"sn-pay-lang-badge",style:{backgroundColor:"#ffffff",color:"#00684a"},children:"EN"}),` +
            `o.jsx("span",{className:"sn-pay-lang-badge",style:{backgroundColor:"#ffffff",color:"#00684a"},children:"বাংলা"})` +
          `]})` +
        `]})` +
      `]})` +
    `]}),` +

    // Pink warning notice card (2 lines)
    `o.jsx("div",{className:"sn-pay-pink-alert-wrap",children:` +
      `o.jsxs("div",{className:"sn-pay-pink-alert",style:{backgroundColor:"#fff5f5",borderColor:"#fed7d7",color:"#d1293d"},children:[` +
        `"আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT ",parseFloat(Is||ys||"306").toFixed(2),"),",` +
        `o.jsx("br",{}),` +
        `"আপনি ক্রেডিট পেতে সক্ষম হবেন না।"` +
      `]})` +
    `}),` +

    // Brand banner (Bkash / Nagad / Rocket) - full width
    `o.jsxs("div",{className:"sn-pay-brand-banner "+(Be==="nagad"?"sn-pay-banner-nagad":Be==="rocket"?"sn-pay-banner-rocket":"sn-pay-banner-bkash"),style:{backgroundColor:Be==="nagad"?"#eb1c24":Be==="rocket"?"#8c1569":"#941f6e",color:"#ffffff"},children:[` +
      `o.jsxs("div",{className:"sn-pay-banner-left",children:[` +
        `o.jsx("div",{className:"sn-pay-brand-logo-box",style:{backgroundColor:"#ffffff"},children:` +
          `o.jsx("img",{src:(Bi.find(E=>E.id===Be))?.logo||Bi[0].logo,alt:Be,className:"sn-pay-brand-logo-img"})` +
        `}),` +
        `o.jsxs("div",{className:"sn-pay-brand-title",style:{color:"#ffffff"},children:[` +
          `(Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash")+" Deposit"` +
        `]})` +
      `]}),` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"sn-pay-close-btn",children:o.jsx(Ts,{size:20})})` +
    `]}),` +

    // Instructional text
    `o.jsx("div",{className:"sn-pay-instructions-wrap",children:` +
      `o.jsxs("p",{className:"sn-pay-instructions-p",children:[` +
        `"নিচে দেওয়া ",` +
        `o.jsx("strong",{className:"sn-pay-instructions-strong",children:Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":"Bkash"}),` +
        `" নাম্বারে নির্দিষ্ট টাকা জমা করুন। অনুগ্রহ করে সঠিক ",` +
        `o.jsx("span",{children:"type"}),` +
        `" নির্বাচন করে নির্দেশনা অনুসরণ করুন।"` +
      `]})` +
    `}),` +

    // Wallet No label line with red *
    `o.jsxs("div",{className:"sn-pay-wallet-row",children:[` +
      `o.jsx("span",{className:"sn-pay-wallet-label",children:"Wallet No"}),` +
      `o.jsx("span",{className:"sn-pay-wallet-sub",children:"এই নাম্বারে শুধুমাত্র Personal গ্রহণ করা হয়"}),` +
      `o.jsx("span",{className:"sn-pay-required-star",children:"*"}),` +
    `]}),` +

    // Send Money Only Alert Card
    `o.jsx("div",{className:"sn-pay-sendmoney-wrap",children:` +
      `o.jsx("div",{className:"sn-pay-sendmoney-card",style:{backgroundColor:"#fff5f5",borderLeft:"4px solid #d81b60",color:"#c2185b"},children:` +
        `o.jsxs("div",{children:[` +
          `"এই ",Be==="bkash"?"বিকাশ":Be==="nagad"?"নগদ":Be==="rocket"?"রকেট":"বিকাশ"," Personal নাম্বারে শুধুমাত্র সেন্ড মানি গ্রহণ করা হয়।"` +
        `]})` +
      `})` +
    `}),` +

    // Number Box with Mint-Green Copy Button
    `o.jsx("div",{className:"sn-pay-number-wrap",children:` +
      `o.jsxs("div",{className:"sn-pay-number-box",style:{backgroundColor:"#f0f4f8"},children:[` +
        `o.jsx("span",{className:"sn-pay-number-text",children:Ys}),` +
        `o.jsxs("button",{type:"button",onClick:()=>Z(Ys,"agent"),className:"sn-pay-copy-btn",style:{backgroundColor:"#c6f6d5",color:"#065f46"},children:[` +
          `o.jsx(ih,{size:16}),` +
          `o.jsx("span",{children:T==="agent"?"কপি হয়েছে":"কপি"})` +
        `]})` +
      `]})` +
    `}),` +

    // TrxID Input Label
    `o.jsxs("div",{className:"sn-pay-trx-label-row",children:[` +
      `o.jsx("span",{className:"sn-pay-trx-label",children:"ক্যাশআউট / সেন্ড মানি TrxID নম্বরটি লিখুন"}),` +
      `o.jsx("span",{className:"sn-pay-required-star",children:"*"}),` +
    `]}),` +

    // TrxID Input Field with Coral/Red Border
    `o.jsx("div",{className:"sn-pay-trx-input-wrap",children:` +
      `o.jsx("input",{type:"text",value:oi,onChange:E=>Xt(E.target.value),className:"sn-pay-trx-input",style:{backgroundColor:"#ffffff",border:"1.5px solid #f87171",color:"#1e293b"},placeholder:"TrxID লিখুন"})` +
    `}),` +

    // Warning Notice Box
    `o.jsx("div",{className:"sn-pay-warning-wrap",children:` +
      `o.jsxs("div",{className:"sn-pay-warning-box",style:{backgroundColor:"#fff5f5",borderColor:"#fed7d7"},children:[` +
        `o.jsx("div",{className:"sn-pay-warning-title",children:"সতর্কতা:"}),` +
        `o.jsx("div",{className:"sn-pay-warning-desc",style:{color:"#dc2626"},children:"লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় ক্রেডিট ব্যর্থ হবে!!"})` +
      `]})` +
    `}),` +

    // Submit Button (জমা দিন)
    `o.jsx("div",{className:"sn-pay-submit-wrap",children:` +
      `o.jsx("button",{type:"button",onClick:v,disabled:Ee,className:"sn-pay-submit-btn "+(Be==="nagad"?"sn-pay-btn-nagad":Be==="rocket"?"sn-pay-btn-rocket":"sn-pay-btn-bkash"),style:{backgroundColor:Be==="nagad"?"#eb1c24":Be==="rocket"?"#8c1569":"#c2185b",color:"#ffffff"},children:` +
        `Ee?o.jsx(pr,{size:20,className:"animate-spin"}):"জমা দিন"` +
      `})` +
    `}),` +

    // Close button
    `o.jsx("div",{className:"sn-pay-back-wrap",children:` +
      `o.jsx("button",{type:"button",onClick:()=>Ls(!1),className:"sn-pay-back-btn",children:"ফিরে যান"})` +
    `})` +
  `]})})`;

const wrapped = "function test() { return (" + exactScreenshotPaymentScreen + ": false); }";
acorn.parse(wrapped, { ecmaVersion: 2020 });
console.log("Acorn check PASSED cleanly!");
esbuild.transformSync(wrapped, { loader: "js" });
console.log("esbuild check PASSED cleanly!");
