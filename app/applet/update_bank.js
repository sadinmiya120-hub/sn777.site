const fs = require("fs");
const esbuild = require("esbuild");

let js = fs.readFileSync("dist_backup/assets/index-CUhzlpga-v3.js", "utf8");

const bankAccountComponentCode = `var BankAccountSection = function(props) {
  var user = props.user || {};
  var currentMethod = props.currentMethod || "bkash";
  var initialHolder = user.username || user.name || "Suya120";

  var availableMethods = [
    { id: "bkash", name: "বিকাশ", color: "#e2136e", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4UEkhLBUdrPpR2LIahMVOX-QLJ1WG4J1qhr1UUXqDsJYu30zIBFnIuzxDCs5GXkxhvfbjYiiWUNi8hxAFjGCVyntU1_eJ0aGlAjBCPy_0sUgYbyViV9dinzv32zD9fJrdTHUv-sWXy-3AVQwxByAJYVKepxzGIOs6eri4O_UgKPUxSa5Gqkm_t4AbMuny/s554/images%20(18).jpeg" },
    { id: "nagad", name: "নগদ", color: "#f7941d", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-QTVs9eBas6GpK2ydqhcGMQylNU_pN-s36BYRmohiHGhQ1WatvM-iqpa1sjGrZIMl2qw0UNhtBFMeNATQy3PJW5z8Eet99916DdaTFQ7fXTGyfEthPITh57pDMhcU4aPXAVvXwMNCmF_h5xSOBP_tRoUzfED_jRU-tzOU0vJx19y_FYAe6C-7Z_7ajilj/s447/images%20(1).png" },
    { id: "usdt", name: "USDT TRC20", color: "#26A17B", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEinbv1oI15e-Jp0zB1Azo4pfZ5uXFZ1EaUkAOhBXQedNIxDG5O-7NIFy-gMxUg6b4en5Gc0bXbH4M7tNgbFV354pB3i62yJcdUlOy81JtbLFS3fMJQnt5_XDFFFs9I5imIfBq-7pnPwBQiUDkVtJh255zXfAOzCRkFzmMAKXTqmuY5jDHAAXk7xLAUErDgj/s307/images.png" },
    { id: "usdterc20", name: "USDT ERC20", color: "#26A17B", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjAfY71CXhfNmfj2KgJlMVO3w5YdBXs8cyxBGKWNya-FgZEb2ekT3bZxSyg3JI_-9uIT1hyjAPmWzbf03fyhROfJtIfdNMKLUEUCXJ43ir7Ayneb_Os7YHlcIsbNpU8bRVp_ofs_9mOK1aanvfeC6V-367VxDI-w76qrw7glWcDueD-A2r0b7Hf1xERrOlF/s307/images%20(1).png" },
    { id: "rocket", name: "রকেট", color: "#8c3494", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFVmKvc3KffHS-VDzbGcdFHlemdquFGYdtTBmQNpOVkJfOYN1rPJqiyQTSfT3CdTpYZDojYkoH3ZFMToyxMmhBenZSsyjlNavKeD5gjorThl1mD2NM4sAAI9iNpDwPfQrOomgPWQUhruE-jKow3JIeXbjgDQ-BR8-tmHPSeLNgVPI4eRBMC8gSHRwciSQx/s447/images%20(29).jpeg" },
    { id: "mcash", name: "এম ক্যাশ", color: "#d32f2f", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhwGgaxy7NlzhwAT3P8KNis4n67oEL5ODUTohrjnREO3QbIZVRrX3gd0z_2XLZsTAF0xN7t2We-mnDPZ2f92ZWDBK8XETivynMjbYoAaLDNbhCLwZWnKOarzlNSXK9UulBIVaTdDxOeYhZPSBZeqbCJ4iPW14IZrQF-ZQNHZQt-32ihYv5gL9ai84Xdnp-V/s240/images%20(2).png" },
    { id: "cellfin", name: "সেলফিন", color: "#169347", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjM8MgX1n_z0wQjpJEmLLM3S7fu63z5pmlsCNWm96H2_GWzGkktfu5pcn3vRcjJ0t5CgKvU5xyY0pybT0Qqin67zvcVPi4g3Y-mSsKlm4Ivw-9sWJwVV59b2M3t1EtKiXCA6H_kW59lWC8IIpAjQxUnL6bnXlSBzT7LxvslWAygv2DuQY3CH5KfcijLFxPk/s447/images%20(3).png" },
    { id: "upay", name: "উপায়", color: "#ffd100", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgaqzmeDF8LCwofik99NpSLpi_hXf_K0yP27QaksiFaLMVLHmhz70K4Y6c17TdrWzl_gYAbf10fmWT4P7h4TP6BwkUA-R0SxH44EHvKl7TGx_qUYA17rJpF2fh7XgGzJnVPo_4f7Gra99OIOl9EgzUVqktUyvQD9UyWWQsvaeGsE5RSVWqkiqScN_8miJ5L/s240/images%20(4).png" }
  ];

  var stateArr = R.useState(function() {
    try {
      var saved = localStorage.getItem("sn777_user_bank_accounts");
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return [];
  });
  var accounts = stateArr[0];
  var setAccounts = stateArr[1];

  var idArr = R.useState(function() {
    return localStorage.getItem("sn777_selected_bank_id") || (accounts[0] ? accounts[0].id : "");
  });
  var selectedId = idArr[0];
  var setSelectedId = idArr[1];

  var modalArr = R.useState(false);
  var isModalOpen = modalArr[0];
  var setIsModalOpen = modalArr[1];

  var bTypeArr = R.useState(currentMethod || "bkash");
  var bankType = bTypeArr[0];
  var setBankType = bTypeArr[1];

  var accNumArr = R.useState("");
  var accNumber = accNumArr[0];
  var setAccNumber = accNumArr[1];

  var accHoldArr = R.useState(initialHolder);
  var accHolder = accHoldArr[0];
  var setAccHolder = accHoldArr[1];

  var accTypeArr = R.useState("Personal");
  var accType = accTypeArr[0];
  var setAccType = accTypeArr[1];

  R.useEffect(function() {
    if (currentMethod) {
      setBankType(currentMethod);
    }
  }, [currentMethod]);

  var activeAcc = accounts.find(function(a) { return a.id === selectedId; }) || accounts[0];
  var activeMethodInfo = availableMethods.find(function(m) { return m.id === (activeAcc && activeAcc.methodId); }) || availableMethods.find(function(m) { return m.id === (activeAcc && activeAcc.bankType && activeAcc.bankType.toLowerCase()); }) || availableMethods[0];

  R.useEffect(function() {
    if (activeAcc) {
      try {
        localStorage.setItem("sn777_active_bank_account", JSON.stringify(activeAcc));
        localStorage.setItem("sn777_selected_bank_id", activeAcc.id);
      } catch(e) {}
    } else {
      try {
        localStorage.removeItem("sn777_active_bank_account");
      } catch(e) {}
    }
  }, [activeAcc]);

  var handleSave = function() {
    var num = accNumber.trim();
    if (!num || num.length < 8) {
      alert("অনুগ্রহ করে সঠিক নম্বর বা ওয়ালেট লিঙ্ক দিন");
      return;
    }
    var holder = accHolder.trim() || initialHolder;
    var matchedOpt = availableMethods.find(function(m) { return m.id === bankType; }) || availableMethods[0];
    var newAcc = {
      id: "acc_" + Date.now(),
      methodId: matchedOpt.id,
      bankType: matchedOpt.name,
      logo: matchedOpt.logo,
      accNumber: num,
      accHolder: holder,
      accType: accType,
      createdAt: new Date().toISOString()
    };
    var updated = [newAcc].concat(accounts.filter(function(a) { return a.methodId !== matchedOpt.id; }));
    setAccounts(updated);
    setSelectedId(newAcc.id);
    try {
      localStorage.setItem("sn777_user_bank_accounts", JSON.stringify(updated));
      localStorage.setItem("sn777_selected_bank_id", newAcc.id);
      localStorage.setItem("sn777_active_bank_account", JSON.stringify(newAcc));
    } catch(e) {}
    setIsModalOpen(false);
    setAccNumber("");
  };

  var isCrypto = ["usdt", "usdterc20"].includes(bankType);

  return o.jsxs("div", {
    className: "bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3",
    children: [
      o.jsxs("div", {
        className: "flex items-center justify-between mb-1",
        children: [
          o.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              o.jsx("div", { className: "w-1.5 h-5 bg-[#00559b] rounded-full" }),
              o.jsx("h2", { className: "text-slate-800 font-black text-sm", children: "ব্যাংক একাউন্ট যোগ করুন" })
            ]
          }),
          activeAcc && o.jsxs("button", {
            type: "button",
            onClick: function() { setIsModalOpen(true); },
            className: "px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#00559b] text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all border border-blue-200/60",
            children: [
              o.jsx("span", { className: "text-sm leading-none font-black", children: "+" }),
              o.jsx("span", { children: "নতুন যোগ করুন" })
            ]
          })
        ]
      }),
      !activeAcc ? o.jsxs("button", {
        type: "button",
        onClick: function() { setIsModalOpen(true); },
        className: "w-full border-2 border-dashed border-[#00559b]/40 hover:border-[#00559b] bg-blue-50/30 hover:bg-blue-50/70 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center transition-all group active:scale-[0.99] shadow-sm",
        children: [
          o.jsx("div", {
            className: "w-12 h-12 rounded-full bg-[#00559b] text-white flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-110 transition-transform",
            children: o.jsx("span", { className: "text-2xl font-black leading-none", children: "+" })
          }),
          o.jsx("span", {
            className: "text-[#00559b] font-black text-base tracking-wide mt-1",
            children: "+ ব্যাংক একাউন্ট যোগ করুন"
          }),
          o.jsx("span", {
            className: "text-slate-500 text-xs font-semibold max-w-xs leading-relaxed",
            children: "বিকাশ, নগদ, রকেট, এম ক্যাশ, সেলফিন, উপায় বা USDT একাউন্ট যোগ করুন"
          })
        ]
      }) : o.jsxs("div", {
        className: "space-y-2.5",
        children: [
          o.jsxs("div", {
            className: "bg-gradient-to-r from-[#00559b] to-[#0072ce] rounded-2xl p-4 text-white shadow-xl shadow-blue-900/15 border border-white/10 relative overflow-hidden",
            children: [
              o.jsxs("div", {
                className: "flex items-center justify-between mb-3",
                children: [
                  o.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      (activeAcc.logo || (activeMethodInfo && activeMethodInfo.logo)) ? o.jsx("img", {
                        src: activeAcc.logo || (activeMethodInfo && activeMethodInfo.logo),
                        alt: activeAcc.bankType,
                        className: "w-7 h-7 object-contain rounded-lg bg-white p-0.5 shadow-sm"
                      }) : null,
                      o.jsx("div", {
                        className: "px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white font-black text-xs uppercase tracking-wider border border-white/20",
                        children: activeAcc.bankType || "বিকাশ"
                      }),
                      !["usdt", "usdterc20"].includes(activeAcc.methodId || "") && o.jsx("span", {
                        className: "text-[11px] font-bold text-blue-100",
                        children: activeAcc.accType === "Personal" ? "পার্সোনাল" : activeAcc.accType === "Agent" ? "এজেন্ট" : "সেভিংস"
                      })
                    ]
                  }),
                  o.jsxs("div", {
                    className: "flex items-center gap-1 bg-emerald-500/25 border border-emerald-300/40 px-2 py-0.5 rounded-full text-emerald-200 text-[10px] font-black",
                    children: [
                      o.jsx("span", { children: "✓" }),
                      o.jsx("span", { children: "সিলেক্টেড" })
                    ]
                  })
                ]
              }),
              o.jsxs("div", {
                className: "flex items-center justify-between gap-2",
                children: [
                  o.jsxs("div", {
                    className: "truncate",
                    children: [
                      o.jsx("span", {
                        className: "text-blue-200 text-[10px] font-bold uppercase tracking-wider block",
                        children: "একাউন্ট হোল্ডার"
                      }),
                      o.jsx("span", {
                        className: "text-white font-black text-sm tracking-wide truncate block",
                        children: activeAcc.accHolder || initialHolder
                      })
                    ]
                  }),
                  o.jsxs("div", {
                    className: "text-right shrink-0",
                    children: [
                      o.jsx("span", {
                        className: "text-blue-200 text-[10px] font-bold uppercase tracking-wider block",
                        children: ["usdt", "usdterc20"].includes(activeAcc.methodId || "") ? "ওয়ালেট অ্যাড্রেস" : "একাউন্ট নম্বর"
                      }),
                      o.jsx("span", {
                        className: "text-white font-black text-base sm:text-lg tracking-wider drop-shadow-sm font-mono",
                        children: activeAcc.accNumber
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          accounts.length > 1 && o.jsxs("div", {
            className: "flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none",
            children: accounts.map(function(acc) {
              var isSel = acc.id === (activeAcc && activeAcc.id);
              var mInfo = availableMethods.find(function(m) { return m.id === acc.methodId; }) || {};
              return o.jsxs("button", {
                key: acc.id,
                type: "button",
                onClick: function() { setSelectedId(acc.id); },
                className: "px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 " + (isSel ? "border-[#00559b] bg-blue-50 text-[#00559b] ring-1 ring-[#00559b]" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"),
                children: [
                  (acc.logo || mInfo.logo) && o.jsx("img", { src: acc.logo || mInfo.logo, className: "w-4 h-4 object-contain" }),
                  o.jsx("span", { className: "font-black", children: acc.bankType + ":" }),
                  o.jsx("span", { children: acc.accNumber.length > 12 ? acc.accNumber.substring(0, 8) + "..." : acc.accNumber })
                ]
              });
            })
          })
        ]
      }),
      isModalOpen && o.jsxs("div", {
        className: "fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
        children: [
          o.jsx("div", {
            className: "absolute inset-0",
            onClick: function() { setIsModalOpen(false); }
          }),
          o.jsxs("div", {
            className: "relative bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 z-10 max-h-[90vh] overflow-y-auto",
            children: [
              o.jsxs("div", {
                className: "flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4",
                children: [
                  o.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      o.jsx("div", { className: "w-2 h-5 bg-[#00559b] rounded-full" }),
                      o.jsx("h3", { className: "text-base font-black text-slate-800 uppercase tracking-tight", children: "ব্যাংক একাউন্ট যোগ করুন" })
                    ]
                  }),
                  o.jsx("button", {
                    type: "button",
                    onClick: function() { setIsModalOpen(false); },
                    className: "px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs active:scale-95 transition-all shadow-md shadow-red-600/20",
                    children: "✕ বন্ধ করুন"
                  })
                ]
              }),
              o.jsxs("div", {
                className: "space-y-4",
                children: [
                  o.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      o.jsx("label", { className: "text-xs font-black text-slate-700 block uppercase tracking-wider", children: "উত্তোলনের মেথড নির্বাচন করুন" }),
                      o.jsx("div", {
                        className: "grid grid-cols-4 gap-2",
                        children: availableMethods.map(function(opt) {
                          var isBSelected = bankType === opt.id;
                          return o.jsxs("button", {
                            key: opt.id,
                            type: "button",
                            onClick: function() { setBankType(opt.id); },
                            className: "p-2 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all " + (isBSelected ? "border-[#00559b] bg-blue-50/70 shadow-sm ring-1 ring-[#00559b]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"),
                            children: [
                              o.jsx("div", {
                                className: "w-9 h-9 rounded-lg flex items-center justify-center p-1 bg-white border border-slate-100 shadow-xs",
                                children: opt.logo ? o.jsx("img", { src: opt.logo, alt: opt.name, className: "w-full h-full object-contain" }) : o.jsx("span", { className: "text-xs font-black", children: opt.name.charAt(0) })
                              }),
                              o.jsx("span", { className: "text-[10px] font-black leading-tight " + (isBSelected ? "text-[#00559b]" : "text-slate-700"), children: opt.name })
                            ]
                          });
                        })
                      })
                    ]
                  }),
                  !isCrypto && o.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      o.jsx("label", { className: "text-xs font-black text-slate-700 block uppercase tracking-wider", children: "একাউন্ট হোল্ডারের নাম" }),
                      o.jsx("input", {
                        type: "text",
                        value: accHolder,
                        onChange: function(e) { setAccHolder(e.target.value); },
                        placeholder: "আপনার নাম লিখুন",
                        className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#00559b] outline-none text-slate-800 text-sm font-bold bg-slate-50 focus:bg-white transition-all shadow-inner"
                      })
                    ]
                  }),
                  o.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      o.jsx("label", { className: "text-xs font-black text-slate-700 block uppercase tracking-wider", children: isCrypto ? (bankType === "usdt" ? "USDT TRC20 ওয়ালেট অ্যাড্রেস" : "USDT ERC20 ওয়ালেট অ্যাড্রেস") : "একাউন্ট / মোবাইল নম্বর" }),
                      o.jsx("input", {
                        type: "text",
                        inputMode: isCrypto ? "text" : "numeric",
                        value: accNumber,
                        onChange: function(e) { setAccNumber(isCrypto ? e.target.value : e.target.value.replace(/[^0-9]/g, "")); },
                        placeholder: isCrypto ? "আপনার USDT ওয়ালেট অ্যাড্রেস দিন" : "যেমন: 01XXXXXXXXX বা একাউন্ট নম্বর",
                        className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#00559b] outline-none text-slate-800 text-sm font-bold bg-slate-50 focus:bg-white transition-all shadow-inner"
                      })
                    ]
                  }),
                  !isCrypto && o.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      o.jsx("label", { className: "text-xs font-black text-slate-700 block uppercase tracking-wider", children: "একাউন্টের ধরন" }),
                      o.jsx("div", {
                        className: "grid grid-cols-3 gap-2",
                        children: ["Personal", "Agent", "Savings"].map(function(t) {
                          var isT = accType === t;
                          var label = t === "Personal" ? "পার্সোনাল" : t === "Agent" ? "এজেন্ট" : "সেভিংস";
                          return o.jsx("button", {
                            key: t,
                            type: "button",
                            onClick: function() { setAccType(t); },
                            className: "py-2 rounded-xl border text-xs font-black transition-all " + (isT ? "border-[#00559b] bg-blue-50 text-[#00559b] ring-1 ring-[#00559b]" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"),
                            children: label
                          });
                        })
                      })
                    ]
                  }),
                  o.jsx("button", {
                    type: "button",
                    onClick: handleSave,
                    className: "w-full py-4 rounded-2xl bg-[#00559b] hover:bg-[#004a87] text-white font-black text-base shadow-xl shadow-blue-900/20 active:scale-98 transition-all mt-2",
                    children: "একাউন্ট সংরক্ষণ করুন"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
};`;

// Replace previous BankAccountSection
const pStart = js.indexOf("var BankAccountSection");
const pBi = js.indexOf("const Bi=[{id:\"bkash\"");

if (pStart !== -1 && pBi !== -1 && pStart < pBi) {
  js = js.substring(0, pStart) + bankAccountComponentCode + ";\n" + js.substring(pBi);
} else {
  js = bankAccountComponentCode + ";\n" + js;
}

esbuild.transformSync(js, { loader: "js" });

fs.writeFileSync("dist/assets/index-CUhzlpga-v3.js", js, "utf8");
fs.writeFileSync("dist_backup/assets/index-CUhzlpga-v3.js", js, "utf8");
console.log("SUCCESSFULLY COMPILED AND WRITTEN JS!");
