const fs = require("fs");
const esbuild = require("esbuild");

const code = fs.readFileSync("dist_backup/assets/index-CUhzlpga-v3.js", "utf8");
const lines = code.split("\n");
const line = lines[4264];

const p = line.indexOf("সীমা সতর্কতা!");
const modalStart = line.lastIndexOf("o.jsx(tn,", p);
console.log("modalStart:", modalStart);

for (let end = p; end < p + 5000; end++) {
  const candidate = line.substring(modalStart, end);
  try {
    esbuild.transformSync("function test() { return " + candidate + "; }", { loader: "js" });
    console.log("Found valid candidate at end index:", end);
    console.log("Valid candidate substring:", candidate);
    break;
  } catch (e) {
    //
  }
}
