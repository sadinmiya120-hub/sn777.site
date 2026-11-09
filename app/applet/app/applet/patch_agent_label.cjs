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

  if (code.includes(" এজেন্ট:")) {
    code = code.replace(/\$\{Be\}\s*এজেন্ট:/g, '${Be==="bkash"?"বিকাশ পার্সোনাল":Be==="nagad"?"নগদ পার্সোনাল":Be==="rocket"?"রকেট পার্সোনাল":Be+" পার্সোনাল"}');
    console.log(`[${file}] Replaced agent label.`);
  }

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Saved successfully.`);
  } catch (err) {
    console.error(`[${file}] Build error:`, err.message);
  }
});
