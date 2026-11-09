const fs = require("fs");
const path = require("path");

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

  // 1. Ensure object has exact image in games array
  if (code.includes(`title:"AVIATOR2"`)) {
    code = code.replace(/\{title:"AVIATOR2",image:"[^"]+",category:"ক্র্যাশ",isHot:[^}]+\}/g, aviator2Obj);
    console.log(`Updated AVIATOR2 image & item in ${path.basename(filePath)}`);
  } else {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, aviator2Obj + "," + marker);
      console.log(`Added AVIATOR2 item to Crash category in ${path.basename(filePath)}`);
    }
  }

  // 2. Remove AVIATOR2 from direct game launch (Aviator launch)
  if (code.includes('||E==="AVIATOR2"')) {
    code = code.replace('||E==="AVIATOR2"', '');
    console.log(`Removed AVIATOR2 from direct game launch in ${path.basename(filePath)}`);
  }

  // 3. Add AVIATOR2 to provider folder rules check (direct rules modal)
  if (code.includes('if(E==="CRASH88"') && !code.includes('if(E==="AVIATOR2"||E==="CRASH88"')) {
    code = code.replace('if(E==="CRASH88"', 'if(E==="AVIATOR2"||E==="CRASH88"');
    console.log(`Added AVIATOR2 to provider folder rules in ${path.basename(filePath)}`);
  } else if (code.includes('if(E==="JILI"') && !code.includes('AVIATOR2')) {
    code = code.replace('if(E==="JILI"', 'if(E==="AVIATOR2"||E==="JILI"');
    console.log(`Added AVIATOR2 to provider folder rules in ${path.basename(filePath)}`);
  }

  fs.writeFileSync(filePath, code, "utf8");
});
