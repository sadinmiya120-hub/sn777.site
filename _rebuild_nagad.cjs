const fs = require("fs");

const v12 = fs.readFileSync("public/assets/index-sn777-v12.js", "utf8");
const cur = fs.readFileSync("public/assets/index-sn777-v13-nagad.js", "utf8");

const biMarker = 'images%20(18).jpeg"}]';
const curBiEnd = cur.indexOf(biMarker);
if (curBiEnd === -1) throw new Error("Cannot find curBiEnd");
const prefix = cur.slice(0, curBiEnd + biMarker.length);

const v12YaStart = v12.indexOf(',ya=[', v12.indexOf('const Bi=['));
const v12PromoStart = v12.indexOf(',K==="promo"&&!xs');
if (v12YaStart === -1 || v12PromoStart === -1) throw new Error("Cannot find v12 middle");
const mid = v12.slice(v12YaStart, v12PromoStart);

const curVoucherStart = cur.indexOf(',K==="voucher"&&!xs');
if (curVoucherStart === -1) throw new Error("Cannot find curVoucherStart");
const suffix = cur.slice(curVoucherStart);

const promoBlock = `,K==="promo"&&!xs&&(()=>{
  const prmSvg=(d,sz=18)=>o.jsx("svg",{viewBox:"0 0 24 24",width:sz,height:sz,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:d});
  return o.jsxs(ce.div,{
    initial:{opacity:0,x:16},
    animate:{opacity:1,x:0},
    exit:{opacity:0,x:-16},
    transition:{duration:.2},
    className:"sn-acc-page",
    style:{paddingBottom:"72px"},
    children:[
      o.jsxs("header",{
        className:"sn-acc-topbar",
        children:[
          o.jsxs("div",{
            className:"sn-acc-topbar-left",
            children:[
              o.jsx("button",{
                type:"button",
                onClick:()=>me(!0),
                className:"sn-acc-menu-btn",
                "aria-label":"মেনু",
                children:prmSvg([
                  o.jsx("line",{x1:3,y1:6,x2:21,y2:6},"l1"),
                  o.jsx("line",{x1:3,y1:12,x2:21,y2:12},"l2"),
                  o.jsx("line",{x1:3,y1:18,x2:21,y2:18},"l3")
                ],20)
              }),
              o.jsx("span",{className:"sn-acc-brand",children:"SN777"})
            ]
          }),
          o.jsxs("div",{
            className:"sn-acc-topbar-right",
            children:[
              o.jsxs("button",{
                type:"button",
                onClick:E=>{E&&E.preventDefault();if(window.showInstallGuideModal){window.showInstallGuideModal()}else if(window.handleAppInstallAction){window.handleAppInstallAction()}},
                className:"sn-acc-top-pill",
                children:[
                  prmSvg([o.jsx("rect",{x:6,y:2,width:12,height:20,rx:2},"r1"),o.jsx("line",{x1:12,y1:18,x2:12.01,y2:18},"r2")],13),
                  o.jsx("span",{children:"App"}),
                  o.jsx("span",{className:"sn-acc-top-pill-dot"})
                ]
              }),
              o.jsxs("button",{
                type:"button",
                onClick:E=>{E.preventDefault();E.stopPropagation();tr()},
                className:"sn-acc-top-pill",
                children:[
                  prmSvg([o.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"},"c1"),o.jsx("line",{x1:8,y1:9,x2:16,y2:9},"c2"),o.jsx("line",{x1:8,y1:13,x2:13,y2:13},"c3")],13),
                  o.jsx("span",{children:"Live Chat"})
                ]
              })
            ]
          })
        ]
      }),
      o.jsxs("div",{
        style:{
          background:"linear-gradient(180deg, #1d439c 0%, #173682 100%)",
          borderTop:"1px solid rgba(255,255,255,0.12)",
          padding:"7px 12px",
          display:"flex",
          alignItems:"center",
          gap:"10px",
          color:"#ffffff",
          boxShadow:"0 2px 6px rgba(15,23,42,0.12)"
        },
        children:[
          o.jsx("button",{
            type:"button",
            onClick:()=>H("home"),
            "aria-label":"ফিরে যান",
            style:{background:"transparent",border:"none",color:"#ffffff",padding:"3px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderRadius:"9999px"},
            children:prmSvg([o.jsx("line",{x1:19,y1:12,x2:5,y2:12},"a1"),o.jsx("polyline",{points:"12 19 5 12 12 5"},"a2")],18)
          }),
          o.jsxs("div",{
            style:{display:"flex",alignItems:"center",gap:"7px",fontSize:"14.5px",fontWeight:700},
            children:[
              prmSvg([o.jsx("path",{d:"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"},"t1"),o.jsx("line",{x1:7,y1:7,x2:7.01,y2:7},"t2")],16),
              o.jsx("span",{children:"প্রমোশন"})
            ]
          })
        ]
      }),
      o.jsxs("div",{
        style:{maxWidth:"540px",margin:"0 auto",padding:"10px 12px 0 12px",display:"flex",flexDirection:"column",gap:"10px"},
        children:[
          o.jsxs("div",{
            style:{background:"#ffffff",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 10px rgba(15,23,42,0.08)",border:"1px solid #e2e8f0"},
            children:[
              o.jsx("img",{
                src:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8diUWUKu_y4fqdBojTQTpvqGub9gap0tS3d_9sNYnhG0QyHIOsIC2Aq_pb8so2vBCK39oaLatJw3XVvy9w52QZtOA6WnlBHc5o6RIFtTXyxYmAPr-fk9q2MQEvmHdVL7oln4Uu9TXf-L7WacY1bNkYwNeZyti1f3HCTLYdPdARI3N9ll5cFnqzgErnFNj/s1024/1794995245645.jpg",
                alt:"দৈনিক ১০০% আনলিমিটেড ডিপোজিট বোনাস",
                onClick:()=>Mi(),
                style:{width:"100%",maxHeight:"190px",objectFit:"cover",display:"block",cursor:"pointer"}
              }),
              o.jsxs("div",{
                style:{padding:"11px 14px 12px 14px"},
                children:[
                  o.jsx("h2",{style:{fontSize:"15px",fontWeight:800,color:"#0f172a",lineHeight:1.3,margin:"0 0 5px 0"},children:"দৈনিক ১০০% আনলিমিটেড ডিপোজিট বোনাস"}),
                  o.jsxs("div",{
                    style:{fontSize:"12.5px",fontWeight:500,color:"#475569",lineHeight:1.5,display:"flex",flexDirection:"column",gap:"2px"},
                    children:[
                      o.jsx("p",{style:{margin:0,color:"#334155",fontWeight:600},children:"কীভাবে দাবি করবেন:"}),
                      o.jsx("p",{style:{margin:0},children:"১. Sn777.site - এ একটি অ্যাকাউন্ট খুলুন।"}),
                      o.jsx("p",{style:{margin:0},children:"২.প্রতিদিন ডিপোজিট করার সময় “550 বা তার ওপরে নির্বাচন করুন / আনলিমিটেড ডিপোজিট বোনাস” অথবা “100%  ডিপোজিট বোনাস” নির্বাচন করুন।"}),
                      o.jsx("p",{style:{margin:0},children:"৩.  bKash, Nagad পেমেন্ট পদ্ধতি ব্যবহার করে আপনার ডিপোজিট করুন।"})
                    ]
                  })
                ]
              })
            ]
          }),
          o.jsxs("div",{
            style:{background:"#ffffff",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 10px rgba(15,23,42,0.08)",border:"1px solid #e2e8f0"},
            children:[
              o.jsx("img",{
                src:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjGYpZ2fYEnEvYaIwrwColaizV1-bS27SVzUifhLCQ8kI9XZIQR2ls_eQgVtFgg2sQdAIM_QpkEYvRF3GphtKrWs91B0ZnXQIBtc8UW2yaZqzJ_1uHAbBzJiThtbcEf9jF40sGblnJVXazfCDLPJptlhkKmAJmYFZLkKrCRP8F9tDzOM1iyds_RzMLszuHG/s1376/1794685890204.jpg",
                alt:"আইফোন মেগা ধামাকা অফার",
                onClick:()=>Mi(),
                style:{width:"100%",maxHeight:"190px",objectFit:"cover",display:"block",cursor:"pointer"}
              }),
              o.jsxs("div",{
                style:{padding:"11px 14px 12px 14px"},
                children:[
                  o.jsx("h2",{style:{fontSize:"15px",fontWeight:800,color:"#0f172a",lineHeight:1.3,margin:"0 0 5px 0"},children:"🔥 মেগা ধামাকা অফার! সীমিত সময়ের জন্য! 🔥"}),
                  o.jsxs("div",{
                    style:{fontSize:"12.5px",fontWeight:500,color:"#475569",lineHeight:1.5,display:"flex",flexDirection:"column",gap:"2px"},
                    children:[
                      o.jsx("p",{style:{margin:0,color:"#334155",fontWeight:600},children:"✨ Sn777.site-এর পক্ষ থেকে সকল সম্মানিত ইউজারদের জানাই আন্তরিক শুভেচ্ছা ও অভিনন্দন! ✨"}),
                      o.jsx("p",{style:{margin:0},children:"আপনাদের গেমিং অভিজ্ঞতাকে আরও রোমাঞ্চকর ও লাভজনক করতে আমরা নিয়ে এসেছি এক অভাবনীয় সুযোগ। আজই আমাদের সাইটে ডিপোজিট করুন এবং জিতে নিন আপনার স্বপ্নের লেটেস্ট মডেলের আইফোন! 🎁📱"}),
                      o.jsx("p",{style:{margin:"3px 0 0 0",color:"#0f172a",fontWeight:700},children:"🎁 অফারের বিবরণ:"}),
                      o.jsx("p",{style:{margin:0},children:"• 📱 আইফোন অফার: মাত্র ১০০০০ টাকা ডিপোজিট করলেই পেয়ে যেতে পারেন প্রিমিয়াম কোয়ালিটির আসল iPhone!"}),
                      o.jsx("p",{style:{margin:"3px 0 0 0",color:"#0f172a",fontWeight:700},children:"⏳ কেন দেরি করছেন?"}),
                      o.jsx("p",{style:{margin:0},children:"এই অফারটি সম্পূর্ণ সীমিত সময়ের জন্য প্রযোজ্য। স্টক শেষ হওয়ার আগেই লুফে নিন আপনার ভাগ্য! যত দ্রুত ডিপোজিট করবেন, বিজয়ী হওয়ার সুযোগ ততটাই বেড়ে যাবে।"}),
                      o.jsx("p",{style:{margin:0},children:"👉 আজই ডিপোজিট করুন এবং আপনার ভাগ্য পরিবর্তন করুন!"}),
                      o.jsx("p",{style:{margin:0,color:"#1d4ed8",fontWeight:700},children:"🚀 ভিজিট করুন: Sn777.site | টেলিগ্রাম সাপোর্ট: @sn777top"})
                    ]
                  })
                ]
              })
            ]
          }),
          o.jsxs("div",{
            style:{background:"#ffffff",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 10px rgba(15,23,42,0.08)",border:"1px solid #e2e8f0"},
            children:[
              o.jsx("img",{
                src:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhFawSNHIkU4TeUHtGcZVIgcpGZ15Dq8ocyvKtRJEzTssJGAtAikryq6uXmetT7x5g-98oQc4p_pthuI8SiQz6cdE9MYhhYAqiSsW9QTywl_8eZr-SNQsbk-7x4-_R9gdJO3e8YOwhWcm3pE8r7ToVaT0SG2BKbLJgUR6-9pE5qSbAdh1att2gJbKLXu63N/s1376/1794687569963.jpg",
                alt:"বাইক মেগা ধামাকা অফার",
                onClick:()=>Mi(),
                style:{width:"100%",maxHeight:"190px",objectFit:"cover",display:"block",cursor:"pointer"}
              }),
              o.jsxs("div",{
                style:{padding:"11px 14px 12px 14px"},
                children:[
                  o.jsx("h2",{style:{fontSize:"15px",fontWeight:800,color:"#0f172a",lineHeight:1.3,margin:"0 0 5px 0"},children:"🔥 মেগা ধামাকা অফার! সীমিত সময়ের জন্য! 🔥"}),
                  o.jsxs("div",{
                    style:{fontSize:"12.5px",fontWeight:500,color:"#475569",lineHeight:1.5,display:"flex",flexDirection:"column",gap:"2px"},
                    children:[
                      o.jsx("p",{style:{margin:0,color:"#334155",fontWeight:600},children:"✨ Sn777.site-এর পক্ষ থেকে সকল সম্মানিত ইউজারদের জানাই আন্তরিক শুভেচ্ছা ও অভিনন্দন! ✨"}),
                      o.jsx("p",{style:{margin:0},children:"আপনাদের গেমিং অভিজ্ঞতাকে আরও রোমাঞ্চকর ও লাভজনক করতে আমরা নিয়ে এসেছি এক অভাবনীয় সুযোগ। আজই আমাদের সাইটে ডিপোজিট করুন এবং জিতে নিন আপনার স্বপ্নের বাইক! 🎁🏍️"}),
                      o.jsx("p",{style:{margin:"3px 0 0 0",color:"#0f172a",fontWeight:700},children:"🎁 অফারের বিবরণ:"}),
                      o.jsx("p",{style:{margin:0},children:"• 🏍️ বিশেষ বাইক অফার: মাত্র ৭৯৯৯ টাকা ডিপোজিট করলেই নিশ্চিতভাবে জিতে নেওয়ার সুযোগ রয়েছে একটি আকর্ষণীয় ব্র্যান্ড নিউ বাইক!"}),
                      o.jsx("p",{style:{margin:"3px 0 0 0",color:"#0f172a",fontWeight:700},children:"⏳ কেন দেরি করছেন?"}),
                      o.jsx("p",{style:{margin:0},children:"এই অফারটি সম্পূর্ণ সীমিত সময়ের জন্য প্রযোজ্য। স্টক শেষ হওয়ার আগেই লুফে নিন আপনার ভাগ্য! যত দ্রুত ডিপোজিট করবেন, বিজয়ী হওয়ার সুযোগ ততটাই বেড়ে যাবে।"}),
                      o.jsx("p",{style:{margin:0},children:"👉 আজই ডিপোজিট করুন এবং আপনার ভাগ্য পরিবর্তন করুন!"}),
                      o.jsx("p",{style:{margin:0,color:"#1d4ed8",fontWeight:700},children:"🚀 ভিজিট করুন: Sn777.site | 💡 শর্ত প্রযোজ্য। বিস্তারিত জানতে আমাদের অফিশিয়াল টেলিগ্রাম লাইভ চ্যাটে যোগাযোগ করুন।"})
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  },"promo");
})()`;

const bonusWalletBlock = `,K==="bonus_wallet"&&!xs&&(()=>{
  const bwSvg=(d,sz=18,sw=2)=>o.jsx("svg",{viewBox:"0 0 24 24",width:sz,height:sz,fill:"none",stroke:"currentColor",strokeWidth:sw,strokeLinecap:"round",strokeLinejoin:"round",children:d});
  const bwNum=parseFloat(String(ve.bonusBalance||0).replace(/,/g,""))||0;
  return o.jsxs(ce.div,{
    initial:{opacity:0,x:16},
    animate:{opacity:1,x:0},
    exit:{opacity:0,x:-16},
    transition:{duration:.2},
    className:"sn-acc-page",
    style:{paddingBottom:"72px"},
    children:[
      o.jsxs("header",{
        className:"sn-acc-topbar",
        children:[
          o.jsxs("div",{
            className:"sn-acc-topbar-left",
            children:[
              o.jsx("button",{
                type:"button",
                onClick:()=>me(!0),
                className:"sn-acc-menu-btn",
                "aria-label":"মেনু",
                children:bwSvg([
                  o.jsx("line",{x1:3,y1:6,x2:21,y2:6},"l1"),
                  o.jsx("line",{x1:3,y1:12,x2:21,y2:12},"l2"),
                  o.jsx("line",{x1:3,y1:18,x2:21,y2:18},"l3")
                ],20)
              }),
              o.jsx("span",{className:"sn-acc-brand",children:"SN777"})
            ]
          }),
          o.jsxs("div",{
            className:"sn-acc-topbar-right",
            children:[
              o.jsxs("button",{
                type:"button",
                onClick:E=>{E&&E.preventDefault();if(window.showInstallGuideModal){window.showInstallGuideModal()}else if(window.handleAppInstallAction){window.handleAppInstallAction()}},
                className:"sn-acc-top-pill",
                children:[
                  bwSvg([o.jsx("rect",{x:6,y:2,width:12,height:20,rx:2},"r1"),o.jsx("line",{x1:12,y1:18,x2:12.01,y2:18},"r2")],13),
                  o.jsx("span",{children:"App"}),
                  o.jsx("span",{className:"sn-acc-top-pill-dot"})
                ]
              }),
              o.jsxs("button",{
                type:"button",
                onClick:E=>{E.preventDefault();E.stopPropagation();tr()},
                className:"sn-acc-top-pill",
                children:[
                  bwSvg([o.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"},"c1"),o.jsx("line",{x1:8,y1:9,x2:16,y2:9},"c2"),o.jsx("line",{x1:8,y1:13,x2:13,y2:13},"c3")],13),
                  o.jsx("span",{children:"Live Chat"})
                ]
              })
            ]
          })
        ]
      }),
      o.jsxs("div",{
        style:{
          background:"linear-gradient(180deg, #1d439c 0%, #173682 100%)",
          borderTop:"1px solid rgba(255,255,255,0.12)",
          padding:"8px 12px",
          display:"flex",
          alignItems:"center",
          gap:"10px",
          color:"#ffffff",
          boxShadow:"0 2px 6px rgba(15,23,42,0.12)"
        },
        children:[
          o.jsx("button",{
            type:"button",
            onClick:()=>H("account"),
            "aria-label":"ফিরে যান",
            style:{background:"transparent",border:"none",color:"#ffffff",padding:"3px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderRadius:"9999px"},
            children:bwSvg([o.jsx("line",{x1:19,y1:12,x2:5,y2:12},"a1"),o.jsx("polyline",{points:"12 19 5 12 12 5"},"a2")],17)
          }),
          o.jsxs("div",{
            style:{display:"flex",alignItems:"center",gap:"7px",fontSize:"15px",fontWeight:700},
            children:[
              bwSvg([
                o.jsx("polyline",{points:"20 12 20 22 4 22 4 12"},"g1"),
                o.jsx("rect",{x:2,y:7,width:20,height:5},"g2"),
                o.jsx("line",{x1:12,y1:22,x2:12,y2:7},"g3"),
                o.jsx("path",{d:"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"},"g4"),
                o.jsx("path",{d:"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"},"g5")
              ],16),
              o.jsx("span",{children:"বোনাস ওয়ালেট"})
            ]
          })
        ]
      }),
      o.jsxs("div",{
        style:{padding:"12px",maxWidth:"540px",margin:"0 auto"},
        children:[
          o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"12px",
              padding:"14px 16px",
              boxShadow:"0 2px 8px rgba(15,23,42,0.06)",
              border:"1px solid #e2e8f0"
            },
            children:[
              o.jsxs("div",{
                style:{display:"flex",alignItems:"center",gap:"7px",fontSize:"12.5px",fontWeight:700,color:"#1e40af"},
                children:[
                  bwSvg([
                    o.jsx("path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"},"w1"),
                    o.jsx("path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"},"w2")
                  ],15,1.9),
                  o.jsx("span",{children:"বোনাস ওয়ালেট ব্যালেন্স"})
                ]
              }),
              o.jsx("div",{
                style:{
                  fontSize:"26px",
                  fontWeight:900,
                  color:"#1d4ed8",
                  marginTop:"6px",
                  fontVariantNumeric:"tabular-nums",
                  lineHeight:1.15,
                  letterSpacing:"-0.02em"
                },
                children:"৳"+bwNum.toFixed(2)
              })
            ]
          }),
          o.jsx("div",{
            style:{fontSize:"13px",fontWeight:600,color:"#64748b",margin:"12px 2px 10px 2px"},
            children:"উপলব্ধ বোনাস"
          }),
          bwNum>0?o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"12px",
              padding:"14px 16px",
              boxShadow:"0 2px 8px rgba(15,23,42,0.05)",
              border:"1px solid #e2e8f0",
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:"10px"
            },
            children:[
              o.jsxs("div",{
                children:[
                  o.jsx("div",{style:{fontSize:"13.5px",fontWeight:700,color:"#0f172a"},children:"অ্যাক্টিভ বোনাস ব্যালেন্স"}),
                  o.jsxs("div",{style:{fontSize:"12px",color:"#64748b",marginTop:"2px"},children:["উপলব্ধ পরিমাণ: ৳",bwNum.toFixed(2)]})
                ]
              }),
              o.jsx("button",{
                type:"button",
                onClick:()=>H("home"),
                style:{background:"#1d439c",color:"#ffffff",border:"none",borderRadius:"8px",padding:"8px 12px",fontSize:"12px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"},
                children:"গেম খেলুন"
              })
            ]
          }):o.jsxs("div",{
            style:{
              paddingTop:"48px",
              paddingBottom:"48px",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              justifyContent:"center",
              gap:"12px",
              textAlign:"center"
            },
            children:[
              o.jsx("div",{
                style:{
                  width:"56px",
                  height:"56px",
                  borderRadius:"14px",
                  background:"#6b7280",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  color:"#1e40af"
                },
                children:bwSvg([
                  o.jsx("polyline",{points:"20 12 20 22 4 22 4 12"},"eg1"),
                  o.jsx("rect",{x:2,y:7,width:20,height:5},"eg2"),
                  o.jsx("line",{x1:12,y1:22,x2:12,y2:7},"eg3"),
                  o.jsx("path",{d:"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"},"eg4"),
                  o.jsx("path",{d:"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"},"eg5")
                ],26,2.1)
              }),
              o.jsx("div",{
                style:{fontSize:"13.5px",fontWeight:500,color:"#64748b"},
                children:"কোনো বোনাস নেই।"
              })
            ]
          })
        ]
      })
    ]
  },"bonus_wallet");
})()`;

const myVipBlock = `,K==="my_vip"&&!xs&&(()=>{
  const depNum=Number(ve.totalDeposited||0)||0;
  const vpPts=Number(ve.points||0)||0;
  const tiers=[
    {key:"Bronze",label:"BRONZE",lvl:1,target:100000,next:"SILVER"},
    {key:"Silver",label:"SILVER",lvl:2,target:500000,next:"GOLD"},
    {key:"Gold",label:"GOLD",lvl:3,target:2000000,next:"PLATINUM"},
    {key:"Platinum",label:"PLATINUM",lvl:4,target:2000000,next:"MAX"}
  ];
  const tier=depNum>=2000000?tiers[3]:depNum>=500000?tiers[2]:depNum>=100000?tiers[1]:tiers[0];
  const displayRank=(ve.rank&&String(ve.rank).toUpperCase())||tier.label;
  const pct=tier.next==="MAX"?100:Math.min(100,Math.max(0,(depNum/tier.target)*100));
  const needed=Math.max(0,tier.target-depNum);
  const depStr=depNum.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  const targetStr=tier.target.toLocaleString("en-US");
  const neededStr=needed.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  const ptsInputNum=Math.max(0,Math.floor(Number(vipConvertPts)||0));
  const convertedMoney=(ptsInputNum/1000).toFixed(2);

  const handleVipConvert=async()=>{
    if(!ptsInputNum||ptsInputNum<6000){
      setVipConvertMsg({ok:false,text:"সর্বনিম্ন ৬০০০ VP পয়েন্টস প্রয়োজন।"});
      return;
    }
    if(ptsInputNum>vpPts){
      setVipConvertMsg({ok:false,text:"আপনার পর্যাপ্ত VP পয়েন্টস নেই।"});
      return;
    }
    try{
      const newPts=vpPts-ptsInputNum;
      const curBal=parseFloat(String(ve.balance||"0").replace(/,/g,""))||0;
      const newBal=(curBal+ptsInputNum/1000).toFixed(2);
      ss(W=>({...W,points:newPts,balance:newBal}));
      if(gt.currentUser){
        await Es(We(Ie,"users",gt.currentUser.uid),{points:newPts,balance:newBal});
      }
      setVipConvertPts("");
      setVipConvertMsg({ok:true,text:"সফলভাবে ৳"+(ptsInputNum/1000).toFixed(2)+" মেইন ওয়ালেটে যুক্ত হয়েছে।"});
    }catch(err){
      setVipConvertMsg({ok:false,text:"কনভার্ট ব্যর্থ হয়েছে, আবার চেষ্টা করুন।"});
    }
  };

  return o.jsxs(ce.div,{
    initial:{opacity:0,y:12},
    animate:{opacity:1,y:0},
    exit:{opacity:0,y:12},
    transition:{duration:0.2},
    style:{
      minHeight:"100vh",
      background:"#eef2f6",
      display:"flex",
      flexDirection:"column",
      width:"100%"
    },
    children:[
      o.jsxs("div",{
        style:{
          background:"#0d2451",
          padding:"16px 14px 20px",
          color:"#ffffff"
        },
        children:[
          o.jsxs("div",{
            style:{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              marginBottom:"14px"
            },
            children:[
              o.jsx("div",{
                style:{fontSize:"19px",fontWeight:700,color:"#ffffff",letterSpacing:"-0.01em"},
                children:"মাই ভিআইপি"
              }),
              o.jsx("button",{
                type:"button",
                onClick:()=>H("account"),
                "aria-label":"বন্ধ করুন",
                style:{
                  width:"36px",
                  height:"36px",
                  borderRadius:"9999px",
                  background:"rgba(255,255,255,0.16)",
                  border:"none",
                  color:"#ffffff",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  cursor:"pointer"
                },
                children:o.jsxs("svg",{
                  viewBox:"0 0 24 24",
                  width:18,
                  height:18,
                  fill:"none",
                  stroke:"currentColor",
                  strokeWidth:2.2,
                  strokeLinecap:"round",
                  strokeLinejoin:"round",
                  children:[
                    o.jsx("line",{x1:18,y1:6,x2:6,y2:18},"x1"),
                    o.jsx("line",{x1:6,y1:6,x2:18,y2:18},"x2")
                  ]
                })
              })
            ]
          }),
          o.jsxs("div",{
            style:{
              background:"linear-gradient(135deg,#d19b28 0%,#be8619 100%)",
              borderRadius:"14px",
              padding:"16px",
              color:"#ffffff",
              boxShadow:"0 4px 14px rgba(0,0,0,0.18)"
            },
            children:[
              o.jsxs("div",{
                style:{
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"space-between",
                  gap:"10px"
                },
                children:[
                  o.jsxs("div",{
                    style:{display:"flex",alignItems:"center",gap:"12px"},
                    children:[
                      o.jsx("div",{
                        style:{
                          width:"50px",
                          height:"50px",
                          borderRadius:"9999px",
                          background:"rgba(255,255,255,0.22)",
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center",
                          flexShrink:0
                        },
                        children:o.jsxs("svg",{
                          viewBox:"0 0 36 36",
                          width:30,
                          height:30,
                          children:[
                            o.jsx("polygon",{points:"11,5 16,5 18,15 13,15",fill:"#0ea5e9"},"r1"),
                            o.jsx("polygon",{points:"25,5 20,5 18,15 23,15",fill:"#0284c7"},"r2"),
                            o.jsx("circle",{cx:18,cy:23,r:8.5,fill:"#f59e0b",stroke:"#fde047",strokeWidth:1.5},"c1"),
                            o.jsx("polygon",{points:"18,17.8 19.6,21.2 23.3,21.7 20.6,24.3 21.3,28 18,26.2 14.7,28 15.4,24.3 12.7,21.7 16.4,21.2",fill:"#fde047"},"st")
                          ]
                        })
                      }),
                      o.jsxs("div",{
                        children:[
                          o.jsx("div",{
                            style:{fontSize:"11px",fontWeight:700,letterSpacing:"0.04em",color:"rgba(255,255,255,0.92)"},
                            children:"VIP LEVEL"
                          }),
                          o.jsx("div",{
                            style:{fontSize:"24px",fontWeight:900,lineHeight:1.15,color:"#ffffff",marginTop:"2px"},
                            children:displayRank
                          })
                        ]
                      })
                    ]
                  }),
                  o.jsxs("div",{
                    style:{
                      background:"#059669",
                      borderRadius:"8px",
                      padding:"7px 12px",
                      display:"inline-flex",
                      alignItems:"center",
                      gap:"6px",
                      color:"#ffffff",
                      fontSize:"13px",
                      fontWeight:700,
                      whiteSpace:"nowrap",
                      boxShadow:"0 2px 6px rgba(0,0,0,0.12)"
                    },
                    children:[
                      o.jsxs("svg",{
                        viewBox:"0 0 24 24",
                        width:15,
                        height:15,
                        children:[
                          o.jsx("polygon",{points:"7,3 11,3 12,10 9,10",fill:"#38bdf8"},"b1"),
                          o.jsx("polygon",{points:"17,3 13,3 12,10 15,10",fill:"#0284c7"},"b2"),
                          o.jsx("circle",{cx:12,cy:16,r:5.5,fill:"#fbbf24",stroke:"#fef08a",strokeWidth:1},"bc")
                        ]
                      }),
                      o.jsxs("span",{children:["লেভেল ",tier.lvl]})
                    ]
                  })
                ]
              }),
              o.jsx("div",{
                style:{
                  height:"5px",
                  borderRadius:"9999px",
                  background:"rgba(255,255,255,0.28)",
                  overflow:"hidden",
                  margin:"16px 0 6px"
                },
                children:o.jsx("div",{
                  style:{
                    height:"100%",
                    width:pct+"%",
                    background:"#ffffff",
                    borderRadius:"9999px"
                  }
                })
              }),
              o.jsxs("div",{
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  fontSize:"13px",
                  fontWeight:800,
                  fontVariantNumeric:"tabular-nums",
                  color:"#ffffff"
                },
                children:[
                  o.jsx("span",{children:depStr}),
                  o.jsxs("span",{children:["/",targetStr]})
                ]
              }),
              o.jsx("div",{
                style:{
                  marginTop:"10px",
                  fontSize:"12.5px",
                  lineHeight:1.45,
                  color:"rgba(255,255,255,0.92)"
                },
                children:tier.next==="MAX"?"আপনি সর্বোচ্চ ভিআইপি লেভেলে পৌঁছেছেন।":o.jsxs(o.Fragment,{
                  children:[
                    "আপনার প্রয়োজন ",
                    o.jsx("span",{style:{color:"#fdba74",fontWeight:700},children:neededStr}),
                    " আরও ডিপোজিট পরবর্তী ",
                    o.jsx("span",{style:{color:"#34d399",fontWeight:700},children:tier.next}),
                    " লেভেলে যেতে।"
                  ]
                })
              })
            ]
          })
        ]
      }),
      o.jsxs("div",{
        style:{
          padding:"14px 12px 32px",
          flex:1
        },
        children:[
          o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"10px",
              padding:"14px 16px",
              boxShadow:"0 1px 4px rgba(15,23,42,0.06)",
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              marginBottom:"14px"
            },
            children:[
              o.jsxs("div",{
                style:{display:"flex",alignItems:"center",gap:"10px"},
                children:[
                  o.jsx("span",{
                    style:{fontSize:"24px",fontWeight:900,color:"#0f172a",fontVariantNumeric:"tabular-nums"},
                    children:vpPts
                  }),
                  o.jsx("span",{
                    style:{
                      background:"#e0e7ff",
                      color:"#3b82f6",
                      fontSize:"11px",
                      fontWeight:800,
                      padding:"3px 10px",
                      borderRadius:"6px"
                    },
                    children:"VP"
                  })
                ]
              }),
              o.jsxs("button",{
                type:"button",
                onClick:()=>setVipDetailsOpen(v=>!v),
                style:{
                  background:"#059669",
                  color:"#ffffff",
                  border:"none",
                  borderRadius:"8px",
                  padding:"9px 14px",
                  display:"inline-flex",
                  alignItems:"center",
                  gap:"6px",
                  fontSize:"13.5px",
                  fontWeight:700,
                  cursor:"pointer"
                },
                children:[
                  o.jsxs("svg",{
                    viewBox:"0 0 24 24",
                    width:15,
                    height:15,
                    fill:"none",
                    stroke:"currentColor",
                    strokeWidth:2,
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    children:[
                      o.jsx("path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"},"d1"),
                      o.jsx("rect",{x:8,y:2,width:8,height:4,rx:1},"d2"),
                      o.jsx("line",{x1:8,y1:11,x2:16,y2:11},"d3"),
                      o.jsx("line",{x1:8,y1:15,x2:13,y2:15},"d4")
                    ]
                  }),
                  o.jsx("span",{children:"বিস্তারিত"})
                ]
              })
            ]
          }),
          vipDetailsOpen&&o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"10px",
              padding:"14px",
              boxShadow:"0 1px 4px rgba(15,23,42,0.06)",
              marginBottom:"14px",
              display:"flex",
              flexDirection:"column",
              gap:"8px"
            },
            children:[
              o.jsxs("div",{
                style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"},
                children:[
                  o.jsx("span",{style:{fontSize:"14px",fontWeight:800,color:"#0f172a"},children:"ভিআইপি লেভেল সুবিধাসমূহ"}),
                  o.jsx("button",{
                    type:"button",
                    onClick:()=>setVipDetailsOpen(false),
                    style:{background:"#f1f5f9",border:"none",borderRadius:"6px",padding:"4px 10px",fontSize:"12px",fontWeight:700,color:"#475569",cursor:"pointer"},
                    children:"বন্ধ"
                  })
                ]
              }),
              [
                {t:"BRONZE (লেভেল 1)",req:"৳0+",perk:"বেসিক ক্যাশব্যাক ও সাপোর্ট"},
                {t:"SILVER (লেভেল 2)",req:"৳100,000+",perk:"৩% সাপ্তাহিক ক্যাশব্যাক"},
                {t:"GOLD (লেভেল 3)",req:"৳500,000+",perk:"৫% রিলোড বোনাস + দ্রুত উইথড্র"},
                {t:"PLATINUM (লেভেল 4)",req:"৳2,000,000+",perk:"ভিআইপি ম্যানেজার ও ১০% রিবেট"}
              ].map((lv,ix)=>o.jsxs("div",{
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  padding:"10px 12px",
                  borderRadius:"8px",
                  background:lv.t.startsWith(displayRank)?"#eff6ff":"#f8fafc",
                  border:lv.t.startsWith(displayRank)?"1px solid #93c5fd":"1px solid #e2e8f0"
                },
                children:[
                  o.jsxs("div",{
                    children:[
                      o.jsx("div",{style:{fontWeight:800,fontSize:"12.5px",color:"#0f172a"},children:lv.t}),
                      o.jsx("div",{style:{fontSize:"11.5px",color:"#64748b",marginTop:"2px"},children:lv.perk})
                    ]
                  }),
                  o.jsx("span",{style:{fontSize:"12px",fontWeight:700,color:"#1d4ed8",fontVariantNumeric:"tabular-nums"},children:lv.req})
                ]
              },ix))
            ]
          }),
          o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"10px",
              padding:"16px 14px",
              boxShadow:"0 1px 4px rgba(15,23,42,0.06)"
            },
            children:[
              o.jsxs("div",{
                style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"},
                children:[
                  o.jsx("span",{
                    style:{width:"4px",height:"18px",borderRadius:"9999px",background:"#1d63dc",display:"inline-block"}
                  }),
                  o.jsx("span",{
                    style:{fontSize:"16px",fontWeight:800,color:"#1e293b"},
                    children:"VP কনভার্ট"
                  })
                ]
              }),
              o.jsxs("div",{
                style:{
                  background:"#0d2451",
                  borderRadius:"12px",
                  padding:"18px 16px"
                },
                children:[
                  o.jsxs("div",{
                    style:{display:"flex",gap:"14px",alignItems:"flex-start"},
                    children:[
                      o.jsxs("div",{
                        style:{
                          display:"flex",
                          flexDirection:"column",
                          alignItems:"center",
                          gap:"10px",
                          paddingTop:"4px",
                          flexShrink:0
                        },
                        children:[
                          o.jsx("div",{
                            style:{
                              width:"46px",
                              height:"46px",
                              borderRadius:"9999px",
                              background:"rgba(255,255,255,0.09)",
                              display:"flex",
                              alignItems:"center",
                              justifyContent:"center"
                            },
                            children:o.jsxs("svg",{
                              viewBox:"0 0 32 32",
                              width:28,
                              height:28,
                              children:[
                                o.jsx("circle",{cx:16,cy:16,r:14,fill:"#f59e0b"},"cn1"),
                                o.jsx("circle",{cx:16,cy:16,r:11.5,fill:"#facc15",stroke:"#fef08a",strokeWidth:0.8},"cn2"),
                                o.jsx("polygon",{points:"16,8 22,12 10,12",fill:"#b45309"},"bn1"),
                                o.jsx("rect",{x:11,y:13,width:2,height:7,fill:"#b45309"},"bn2"),
                                o.jsx("rect",{x:15,y:13,width:2,height:7,fill:"#b45309"},"bn3"),
                                o.jsx("rect",{x:19,y:13,width:2,height:7,fill:"#b45309"},"bn4"),
                                o.jsx("rect",{x:10,y:20.5,width:12,height:2,fill:"#b45309"},"bn5")
                              ]
                            })
                          }),
                          o.jsx("span",{
                            style:{color:"rgba(255,255,255,0.7)",fontSize:"14px",lineHeight:1},
                            children:"↓"
                          })
                        ]
                      }),
                      o.jsxs("div",{
                        style:{flex:1,minWidth:0},
                        children:[
                          o.jsx("div",{
                            style:{color:"#ffffff",fontSize:"14px",fontWeight:600,marginBottom:"2px"},
                            children:"পয়েন্টস"
                          }),
                          o.jsx("div",{
                            style:{color:"#f59e0b",fontSize:"12px",fontWeight:600,marginBottom:"8px"},
                            children:"ন্যূনতম VP প্রয়োজন: 6000"
                          }),
                          o.jsx("input",{
                            type:"number",
                            min:0,
                            inputMode:"numeric",
                            value:vipConvertPts,
                            onChange:E=>{setVipConvertPts(E.target.value);setVipConvertMsg("")},
                            placeholder:"0",
                            style:{
                              width:"100%",
                              height:"38px",
                              background:"rgba(255,255,255,0.12)",
                              border:"1px solid rgba(255,255,255,0.06)",
                              borderRadius:"6px",
                              padding:"0 12px",
                              color:"#ffffff",
                              fontSize:"14px",
                              fontWeight:600,
                              outline:"none",
                              fontVariantNumeric:"tabular-nums"
                            }
                          }),
                          o.jsxs("div",{
                            style:{margin:"12px 0",fontSize:"13px",color:"#ffffff",fontWeight:500},
                            children:[
                              "VP কনভার্সন রেশিও : ",
                              o.jsx("span",{style:{color:"#f59e0b",fontWeight:700},children:"1000"})
                            ]
                          }),
                          o.jsx("div",{
                            style:{color:"#ffffff",fontSize:"14px",fontWeight:600,marginBottom:"8px"},
                            children:"রিয়েল মানি"
                          }),
                          o.jsx("div",{
                            style:{
                              width:"100%",
                              height:"38px",
                              background:"rgba(255,255,255,0.12)",
                              border:"1px solid rgba(255,255,255,0.06)",
                              borderRadius:"6px",
                              padding:"0 12px",
                              display:"flex",
                              alignItems:"center",
                              color:"#ffffff",
                              fontSize:"14px",
                              fontWeight:600,
                              fontVariantNumeric:"tabular-nums"
                            },
                            children:convertedMoney
                          })
                        ]
                      })
                    ]
                  }),
                  vipConvertMsg&&o.jsx("div",{
                    style:{
                      marginTop:"12px",
                      padding:"8px 12px",
                      borderRadius:"8px",
                      background:vipConvertMsg.ok?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.2)",
                      color:vipConvertMsg.ok?"#6ee7b7":"#fca5a5",
                      fontSize:"12.5px",
                      fontWeight:700,
                      textAlign:"center"
                    },
                    children:vipConvertMsg.text
                  })
                ]
              }),
              o.jsx("button",{
                type:"button",
                onClick:handleVipConvert,
                style:{
                  width:"100%",
                  height:"46px",
                  marginTop:"14px",
                  background:"#52b788",
                  border:"none",
                  borderRadius:"8px",
                  color:"#ffffff",
                  fontSize:"15px",
                  fontWeight:700,
                  cursor:"pointer",
                  boxShadow:"0 2px 6px rgba(82,183,136,0.3)"
                },
                children:"রিয়েল মানিতে কনভার্ট করুন"
              })
            ]
          })
        ]
      })
    ]
  },"my_vip");
})()`;

const affiliateBlock = `,K==="affiliate"&&!xs&&(()=>{
  return o.jsxs(ce.div,{
    initial:{opacity:0,y:12},
    animate:{opacity:1,y:0},
    exit:{opacity:0,y:12},
    transition:{duration:0.2},
    style:{
      minHeight:"100vh",
      background:"#f1f5f9",
      display:"flex",
      flexDirection:"column",
      width:"100%",
      paddingBottom:"40px"
    },
    children:[
      o.jsxs("header",{
        style:{
          padding:"16px 16px 8px 16px",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between"
        },
        children:[
          o.jsx("button",{
            type:"button",
            onClick:()=>H("account"),
            "aria-label":"ফিরে যান",
            style:{
              background:"transparent",
              border:"none",
              color:"#0f172a",
              cursor:"pointer",
              padding:"4px",
              display:"flex",
              alignItems:"center",
              justifyContent:"center"
            },
            children:o.jsx("svg",{
              viewBox:"0 0 24 24",
              width:22,
              height:22,
              fill:"none",
              stroke:"currentColor",
              strokeWidth:2.2,
              strokeLinecap:"round",
              strokeLinejoin:"round",
              children:[
                o.jsx("line",{x1:19,y1:12,x2:5,y2:12},"l1"),
                o.jsx("polyline",{points:"12 19 5 12 12 5"},"l2")
              ]
            })
          }),
          o.jsx("div",{style:{width:"24px"}}),
          o.jsx("div",{style:{width:"24px"}}),
        ]
      }),
      o.jsxs("div",{
        style:{
          padding:"12px 16px 24px",
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          textAlign:"center"
        },
        children:[
          o.jsx("div",{
            style:{
              width:"72px",
              height:"72px",
              borderRadius:"18px",
              background:"linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              color:"#ffffff",
              boxShadow:"0 8px 20px rgba(37,99,235,0.35)",
              marginBottom:"16px"
            },
            children:o.jsx("svg",{
              viewBox:"0 0 24 24",
              width:34,
              height:34,
              fill:"none",
              stroke:"currentColor",
              strokeWidth:2,
              strokeLinecap:"round",
              strokeLinejoin:"round",
              children:[
                o.jsx("circle",{cx:18,cy:5,r:3},"c1"),
                o.jsx("circle",{cx:6,cy:12,r:3},"c2"),
                o.jsx("circle",{cx:18,cy:19,r:3},"c3"),
                o.jsx("line",{x1:8.59,y1:13.51,x2:15.42,y2:17.49},"l1"),
                o.jsx("line",{x1:15.41,y1:6.51,x2:8.59,y2:10.49},"l2")
              ]
            })
          }),
          o.jsx("h1",{
            style:{fontSize:"26px",fontWeight:900,color:"#0f172a",letterSpacing:"-0.03em",margin:"0 0 4px 0"},
            children:"Affiliate Portal"
          }),
          o.jsx("p",{
            style:{fontSize:"13.5px",color:"#64748b",fontWeight:500,margin:"0 0 12px 0"},
            children:"Sign in with your username and password"
          }),
          o.jsx("div",{
            style:{
              background:"#eff6ff",
              border:"1px solid #bfdbfe",
              borderRadius:"12px",
              padding:"8px 16px",
              fontSize:"12.5px",
              fontWeight:700,
              color:"#1d4ed8",
              marginBottom:"14px",
              boxShadow:"0 1px 2px rgba(0,0,0,0.03)"
            },
            children:"রেফার করুন, প্রতিটি Deposit-এ Commission Earnings করুন"
          }),
          o.jsxs("div",{
            style:{
              display:"flex",
              justifyContent:"center",
              gap:"8px",
              flexWrap:"wrap",
              marginBottom:"20px"
            },
            children:[
              o.jsxs("div",{
                style:{
                  background:"#ffffff",
                  border:"1px solid #e2e8f0",
                  borderRadius:"9999px",
                  padding:"6px 14px",
                  fontSize:"12px",
                  fontWeight:700,
                  color:"#334155",
                  display:"flex",
                  alignItems:"center",
                  gap:"6px",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.04)"
                },
                children:[o.jsx("span",{children:"💰"}),o.jsx("span",{children:"লাইফটাইম Commission"})]
              }),
              o.jsxs("div",{
                style:{
                  background:"#ffffff",
                  border:"1px solid #e2e8f0",
                  borderRadius:"9999px",
                  padding:"6px 14px",
                  fontSize:"12px",
                  fontWeight:700,
                  color:"#334155",
                  display:"flex",
                  alignItems:"center",
                  gap:"6px",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.04)"
                },
                children:[o.jsx("span",{children:"⚡"}),o.jsx("span",{children:"দ্রুত Withdraw"})]
              }),
              o.jsxs("div",{
                style:{
                  background:"#ffffff",
                  border:"1px solid #e2e8f0",
                  borderRadius:"9999px",
                  padding:"6px 14px",
                  fontSize:"12px",
                  fontWeight:700,
                  color:"#334155",
                  display:"flex",
                  alignItems:"center",
                  gap:"6px",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.04)"
                },
                children:[o.jsx("span",{children:"📊"}),o.jsx("span",{children:"লাইভ রিপোর্ট"})]
              })
            ]
          }),
          o.jsxs("div",{
            style:{
              display:"flex",
              background:"#e2e8f0",
              borderRadius:"14px",
              padding:"4px",
              width:"100%",
              maxWidth:"380px",
              marginBottom:"20px"
            },
            children:[
              o.jsx("button",{
                type:"button",
                style:{
                  flex:1,
                  background:"#2563eb",
                  color:"#ffffff",
                  border:"none",
                  borderRadius:"11px",
                  padding:"10px",
                  fontSize:"14px",
                  fontWeight:700,
                  cursor:"pointer",
                  boxShadow:"0 2px 6px rgba(0,0,0,0.08)"
                },
                children:"Login"
              }),
              o.jsx("button",{
                type:"button",
                onClick:()=>H("signup"),
                style:{
                  flex:1,
                  background:"transparent",
                  color:"#475569",
                  border:"none",
                  borderRadius:"11px",
                  padding:"10px",
                  fontSize:"14px",
                  fontWeight:700,
                  cursor:"pointer"
                },
                children:"Register"
              })
            ]
          }),
          o.jsxs("div",{
            style:{
              background:"#ffffff",
              borderRadius:"24px",
              padding:"24px 20px",
              width:"100%",
              maxWidth:"380px",
              boxShadow:"0 10px 30px rgba(15,23,42,0.06)",
              border:"1px solid #e2e8f0",
              textAlign:"left"
            },
            children:[
              o.jsx("div",{
                style:{fontSize:"12.5px",fontWeight:700,color:"#475569",marginBottom:"6px"},
                children:"Username"
              }),
              o.jsxs("div",{
                style:{
                  display:"flex",
                  alignItems:"center",
                  background:"#f8fafc",
                  border:"1.5px solid #cbd5e1",
                  borderRadius:"12px",
                  padding:"0 12px",
                  height:"48px",
                  marginBottom:"16px"
                },
                children:[
                  o.jsx("svg",{
                    viewBox:"0 0 24 24",
                    width:18,
                    height:18,
                    fill:"none",
                    stroke:"#94a3b8",
                    strokeWidth:2,
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    children:[
                      o.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"},"u1"),
                      o.jsx("circle",{cx:12,cy:7,r:4},"u2")
                    ]
                  }),
                  o.jsx("input",{
                    type:"text",
                    placeholder:"affiliate username",
                    style:{
                      flex:1,
                      border:"none",
                      background:"transparent",
                      outline:"none",
                      paddingLeft:"10px",
                      fontSize:"14px",
                      fontWeight:600,
                      color:"#0f172a"
                    }
                  })
                ]
              }),
              o.jsx("div",{
                style:{fontSize:"12.5px",fontWeight:700,color:"#475569",marginBottom:"6px"},
                children:"Password"
              }),
              o.jsxs("div",{
                style:{
                  display:"flex",
                  alignItems:"center",
                  background:"#f8fafc",
                  border:"1.5px solid #cbd5e1",
                  borderRadius:"12px",
                  padding:"0 12px",
                  height:"48px",
                  marginBottom:"20px"
                },
                children:[
                  o.jsx("svg",{
                    viewBox:"0 0 24 24",
                    width:18,
                    height:18,
                    fill:"none",
                    stroke:"#94a3b8",
                    strokeWidth:2,
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    children:[
                      o.jsx("rect",{x:3,y:11,width:18,height:11,rx:2,ry:2},"p1"),
                      o.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"},"p2")
                    ]
                  }),
                  o.jsx("input",{
                    type:"password",
                    placeholder:"••••••••",
                    style:{
                      flex:1,
                      border:"none",
                      background:"transparent",
                      outline:"none",
                      paddingLeft:"10px",
                      fontSize:"14px",
                      fontWeight:600,
                      color:"#0f172a"
                    }
                  }),
                  o.jsx("svg",{
                    viewBox:"0 0 24 24",
                    width:18,
                    height:18,
                    fill:"none",
                    stroke:"#94a3b8",
                    strokeWidth:2,
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    style:{cursor:"pointer"},
                    children:[
                      o.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"},"e1"),
                      o.jsx("circle",{cx:12,cy:12,r:3},"e2")
                    ]
                  })
                ]
              }),
              o.jsx("button",{
                type:"button",
                onClick:()=>alert("অ্যাফিলিয়েট লগইন সফল হয়েছে!"),
                style:{
                  width:"100%",
                  height:"48px",
                  background:"linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  border:"none",
                  borderRadius:"12px",
                  color:"#ffffff",
                  fontSize:"15px",
                  fontWeight:800,
                  cursor:"pointer",
                  boxShadow:"0 4px 12px rgba(37,99,235,0.35)"
                },
                children:"Login"
              }),
              o.jsxs("div",{
                style:{textAlign:"center",marginTop:"16px",fontSize:"12.5px",color:"#64748b",fontWeight:500},
                children:[
                  "No account? ",
                  o.jsx("span",{
                    onClick:()=>H("signup"),
                    style:{color:"#2563eb",fontWeight:700,cursor:"pointer"},
                    children:"Register"
                  })
                ]
              })
            ]
          }),
          o.jsx("div",{
            style:{marginTop:"24px",fontSize:"12px",color:"#94a3b8",fontWeight:600},
            children:"🔒 আপনার তথ্য সুরক্ষিত"
          })
        ]
      })
    ]
  },"affiliate");
})()`;

// Update affiliate trigger in account menu
const triggerOld = `label:"এফিলিয়েট",onClick:()=>setAccModal("affiliate")`;
const triggerNew = `label:"এফিলিয়েট",onClick:()=>H("affiliate")`;

const rebuilt = prefix + mid + promoBlock + bonusWalletBlock + myVipBlock + affiliateBlock + suffix;
// Replace menu trigger
let finalRebuilt = rebuilt;
if (finalRebuilt.includes(triggerOld)) {
  finalRebuilt = finalRebuilt.replace(triggerOld, triggerNew);
}

fs.writeFileSync("public/assets/index-sn777-v13-nagad.js", finalRebuilt, "utf8");
fs.writeFileSync("dist/assets/index-sn777-v13-nagad.js", finalRebuilt, "utf8");
console.log("Rebuilt with Affiliate Portal view length:", finalRebuilt.length);
