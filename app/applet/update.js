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

  const oldTarget = 'Be==="binance"||Be==="usdt"?"TRC20 নাম্বারটি এখানে:":`${Be} agent`'.replace("agent", "এজেন্ট:");
  const newTarget = 'Be==="binance"||Be==="usdt"?"TRC20 নাম্বারটি এখানে:":Be==="bkash"?"বিকাশ পার্সোনাল":Be==="nagad"?"নগদ পার্সোনাল":Be==="rocket"?"রকেট পার্সোনাল":`${Be} পার্সোনাল`';

  if (code.includes(oldTarget)) {
    code = code.replace(oldTarget, newTarget);
    console.log(`[${file}] Updated agent label successfully.`);
  } else {
    console.log(`[${file}] oldTarget not found.`);
  }

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Saved successfully.`);
  } catch (err) {
    console.error(`[${file}] Build error:`, err.message);
  }
});
