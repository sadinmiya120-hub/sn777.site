const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const aviator2Obj = `{title:"AVIATOR2",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrG9jOehiozyFRoPwiX4WHCzuVp67dlTUsj_VXSYpy-KddzVy2N6F7cEBv1IjqqUHaPeMcDmGybU0DsNv6PBQXkDoq9iwl35ZhO4A09yx6j0fKrAzWT8oU4taeeL1OEMb-A7Gl41mNF4UBAHcv0GaVthqSgOasLl9JLOh88t6uLMGJcMjWDDP1C3envl-G/s120/provider-awcv2_aviator2.png",category:"ক্র্যাশ",isHot:!0}`;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  if (!code.includes(`title:"AVIATOR2"`)) {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, aviator2Obj + "," + marker);
      fs.writeFileSync(filePath, code, "utf8");
      console.log(`Added AVIATOR2 to Crash category in ${path.basename(filePath)}`);
    }
  } else {
    console.log(`AVIATOR2 already present in ${path.basename(filePath)}`);
  }

  // Also make sure AVIATOR2 launches Aviator when clicked in kc
  if (code.includes('if(E==="Aviator"||E==="AVIATOR"') && !code.includes('AVIATOR2')) {
    code = code.replace(
      'if(E==="Aviator"||E==="AVIATOR"',
      'if(E==="Aviator"||E==="AVIATOR"||E==="AVIATOR2"'
    );
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`Updated kc click handler for AVIATOR2 in ${path.basename(filePath)}`);
  }
});
