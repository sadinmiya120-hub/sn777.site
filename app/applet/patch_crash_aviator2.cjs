const fs = require("fs");
const path = require("path");

console.log("[Crash AVIATOR2 Patch] Starting permanent patch...");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const imgUrl = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrG9jOehiozyFRoPwiX4WHCzuVp67dlTUsj_VXSYpy-KddzVy2N6F7cEBv1IjqqUHaPeMcDmGybU0DsNv6PBQXkDoq9iwl35ZhO4A09yx6j0fKrAzWT8oU4taeeL1OEMb-A7Gl41mNF4UBAHcv0GaVthqSgOasLl9JLOh88t6uLMGJcMjWDDP1C3envl-G/s120/provider-awcv2_aviator2.png";
const aviator2Obj = `{title:"AVIATOR2",image:"${imgUrl}",category:"ক্র্যাশ",isHot:!0}`;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Ensure AVIATOR2 is present in Crash category
  if (code.includes(`title:"AVIATOR2"`)) {
    code = code.replace(/\{title:"AVIATOR2",image:"[^"]+",category:"ক্র্যাশ",isHot:[^}]+\}/g, aviator2Obj);
    modified = true;
  } else {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, aviator2Obj + "," + marker);
      modified = true;
    }
  }

  // Ensure click handler launches Aviator game for AVIATOR2
  if (code.includes('if(E==="Aviator"||E==="AVIATOR"') && !code.includes('AVIATOR2')) {
    code = code.replace(
      'if(E==="Aviator"||E==="AVIATOR"',
      'if(E==="Aviator"||E==="AVIATOR"||E==="AVIATOR2"'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[Crash AVIATOR2 Patch] Processed ${path.basename(filePath)}`);
  }
});

console.log("[Crash AVIATOR2 Patch] Completed successfully!");
