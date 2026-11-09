const fs = require("fs");
const esbuild = require("esbuild");

const files = [
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  // 1. Set Ys default value to "01996306610"
  code = code.replace(/\[Ys,([a-zA-Z0-9_$]+)\]=R\.useState\(""\)/g, '[Ys,$1]=R.useState("01996306610")');
  code = code.replace(/\[Ys,([a-zA-Z0-9_$]+)\]=useState\(""\)/g, '[Ys,$1]=useState("01996306610")');

  // 2. Set default depCh to "normal"
  code = code.replace(/\[depCh,([a-zA-Z0-9_$]+)\]=R\.useState\("gopay"\)/g, '[depCh,$1]=R.useState("normal")');
  code = code.replace(/\[depCh,([a-zA-Z0-9_$]+)\]=useState\("gopay"\)/g, '[depCh,$1]=useState("normal")');

  // 3. Hide GOPay button safely by setting display:none
  code = code.replace(/onClick:\(\)=>setDepCh\("gopay"\)/g, 'style:{display:"none"},onClick:()=>setDepCh("normal")');

  code = code.replace(/২টি চ্যানেল সক্রিয়/g, '১টি চ্যানেল সক্রিয়');

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Successfully hid GOPay and set number 01996306610.`);
  } catch (err) {
    console.error(`[${file}] Build error:`, err.message);
  }
});
