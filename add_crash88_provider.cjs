const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const imgUrl = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiDAhi9FFBlL4i4yXbCAruKcu-_8CELKe5FZb2KfpanCMLV6KlusG8ySCuJ3DEgFPKGkdog3kNBMajR0rcaNgFN3HK82Wwcz0eYU9L6a0wOrPHFbBp42ftXfKA550F60Z30bZO5YXl73ta1Tj17c6BA9EejWIPef82JmgVfdwBiQ6qSjwChljpiBgsz1bEg/s120/provider-awcv2_crash88.png";
const crash88Obj = `{title:"CRASH88",image:"${imgUrl}",category:"ক্র্যাশ",isHot:!0}`;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // 1. Ensure object has exact image in games array
  if (code.includes(`title:"CRASH88"`)) {
    // Replace any existing CRASH88 object with current exact image and category
    code = code.replace(/\{title:"CRASH88",image:"[^"]+",category:"ক্র্যাশ",isHot:[^}]+\}/g, crash88Obj);
    console.log(`Updated CRASH88 image & item in ${path.basename(filePath)}`);
  } else {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, crash88Obj + "," + marker);
      console.log(`Added CRASH88 item to Crash category in ${path.basename(filePath)}`);
    }
  }

  // 2. Remove CRASH88 from direct game launcher (Aviator launch)
  if (code.includes('||E==="CRASH88"')) {
    code = code.replace('||E==="CRASH88"', '');
    console.log(`Removed CRASH88 from direct game launch in ${path.basename(filePath)}`);
  }

  // 3. Add CRASH88 to provider folder rules check (direct rules modal)
  if (code.includes('if(E==="JILI"') && !code.includes('if(E==="CRASH88"||E==="JILI"')) {
    code = code.replace('if(E==="JILI"', 'if(E==="CRASH88"||E==="JILI"');
    console.log(`Added CRASH88 to provider folder rules in ${path.basename(filePath)}`);
  } else if (code.includes('||E==="AVIATOR"') && !code.includes('||E==="CRASH88")')) {
    code = code.replace('||E==="AVIATOR")', '||E==="CRASH88"||E==="AVIATOR")');
    console.log(`Added CRASH88 to provider folder rules check in ${path.basename(filePath)}`);
  }

  fs.writeFileSync(filePath, code, "utf8");
});
