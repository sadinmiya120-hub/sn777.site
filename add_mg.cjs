const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  const pIdx = code.indexOf(`title:"MG",image:`);
  if (pIdx !== -1) {
    let braceCount = 0;
    let startIdx = code.lastIndexOf("{", pIdx);
    let endIdx = startIdx;
    for (let i = startIdx; i < code.length; i++) {
      if (code[i] === "{") braceCount++;
      else if (code[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    const originalMgObj = code.substring(startIdx, endIdx);
    const crashMgObj = originalMgObj.replace(/category:"[^"]+"/, 'category:"ক্র্যাশ"');
    
    if (!code.includes(crashMgObj)) {
      const marker = `{title:"Aviator"`;
      if (code.includes(marker)) {
        code = code.replace(marker, crashMgObj + "," + marker);
        fs.writeFileSync(filePath, code, "utf8");
        console.log(`Added MG folder to Crash category in ${path.basename(filePath)}`);
      }
    } else {
      console.log(`MG crash folder already present in ${path.basename(filePath)}`);
    }
  }
});
