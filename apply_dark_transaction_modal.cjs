const fs = require("fs");
const esbuild = require("esbuild");

const targetFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

targetFiles.forEach(jsPath => {
  if (!fs.existsSync(jsPath)) return;
  let js = fs.readFileSync(jsPath, "utf8");
  const p0 = js.indexOf("o.jsx(tn,{children:kn&&");
  const pEnd = js.indexOf(",o.jsx(tn,{children:Rt&&", p0);
  if (p0 === -1 || pEnd === -1) {
    console.error("Modal section not found in", jsPath);
    return;
  }
  const modalCode = js.substring(p0, pEnd);
  try {
    esbuild.transformSync("function test() { return (" + modalCode + "); }", { loader: "js" });
    console.log("[VALIDATED] Dark transaction modal syntax OK in", jsPath);
  } catch (e) {
    console.error("Syntax error in modal in", jsPath, e);
  }
});
