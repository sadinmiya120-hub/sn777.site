const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const providersToAdd = [
  "KM", "RELAX", "SMARTSOFT", "YL", "CQ9", "Joker", "KA", "RICH88", "LETSGO"
];

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  providersToAdd.forEach(prov => {
    // Find title:"PROV" or title:"prov" or variations
    const regex = new RegExp(`title:"(${prov})",image:`, "i");
    const match = code.match(regex);
    if (!match) {
      console.log(`Provider ${prov} not found in ${path.basename(filePath)}`);
      return;
    }

    const pIdx = code.indexOf(match[0]);
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
      const originalObj = code.substring(startIdx, endIdx);
      const crashObj = originalObj.replace(/category:"[^"]+"/, 'category:"ক্র্যাশ"');

      if (!code.includes(crashObj)) {
        const marker = `{title:"Aviator"`;
        if (code.includes(marker)) {
          code = code.replace(marker, crashObj + "," + marker);
          fs.writeFileSync(filePath, code, "utf8");
          console.log(`Added ${prov} folder to Crash category in ${path.basename(filePath)}`);
        }
      }
    }
  });
});
