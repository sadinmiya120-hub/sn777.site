const fs = require("fs");
const esbuild = require("esbuild");

const BACKEND_URL = "";

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  const oldSnippet = 'window.location.href=`https://sn777.site/gopay_pay.php?uid=${gt.currentUser.uid}&amount=${E}&method=${Be}&order_no=${Te}`,fi("")';
  
  if (code.includes(oldSnippet)) {
    const newSnippet = 'window.location.assign("' + BACKEND_URL + '/gopay_pay.php?uid=" + encodeURIComponent(gt.currentUser ? gt.currentUser.uid : "") + "&amount=" + encodeURIComponent(E) + "&method=" + encodeURIComponent(Be) + "&order_no=" + encodeURIComponent(Te)),fi("")';
    code = code.replace(oldSnippet, newSnippet);
  }

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Enhanced with direct location.assign.`);
  } catch (err) {
    console.error(`[${file}] Build error:`, err.message);
  }
});
