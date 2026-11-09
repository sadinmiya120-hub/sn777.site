const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const smartsoftObj = `{title:"SMARTSOFT",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjn9PCwXIk1ekV5EL36qnpbrEJEL2nwedeYNTizO6WMHMi0C2q1HarR3VyrKWmWC299uQJzgIvz4YxR4zhQbVkM1iHsKRdeeVTNK51B6_wfl5NP-ZI1HBpF00i-daq2PUfkuBqXdAFXym_wqmJpsRsAbn3D4yibh2ZCIifRwJ0ZLYV3RXuCpmYDiW9TpuTb/s120/provider-awcv2_smartsoft.png",category:"ক্র্যাশ",isHot:!1}`;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  if (!code.includes(`title:"SMARTSOFT"`)) {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, smartsoftObj + "," + marker);
      fs.writeFileSync(filePath, code, "utf8");
      console.log(`Added SMARTSOFT to Crash category in ${path.basename(filePath)}`);
    }
  } else {
    console.log(`SMARTSOFT already present in ${path.basename(filePath)}`);
  }

  // Also add SMARTSOFT to provider rules check if needed or handle as folder
  if (code.includes('if(E==="JILI"') && !code.includes('SMARTSOFT')) {
    code = code.replace(
      'if(E==="JILI"',
      'if(E==="SMARTSOFT"||E==="JILI"'
    );
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`Updated provider rules for SMARTSOFT in ${path.basename(filePath)}`);
  }
});
