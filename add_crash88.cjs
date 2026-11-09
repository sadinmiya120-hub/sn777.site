const fs = require("fs");
const path = require("path");

const targets = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "original-index-sn777-v5.js",
  "public/assets/index-sn777-v12.js"
];

const crash88Obj = `{title:"CRASH88",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiDAhi9FFBlL4i4yXbCAruKcu-_8CELKe5FZb2KfpanCMLV6KlusG8ySCuJ3DEgFPKGkdog3kNBMajR0rcaNgFN3HK82Wwcz0eYU9L6a0wOrPHFbBp42ftXfKA550F60Z30bZO5YXl73ta1Tj17c6BA9EejWIPef82JmgVfdwBiQ6qSjwChljpiBgsz1bEg/s120/provider-awcv2_crash88.png",category:"ক্র্যাশ",isHot:!0}`;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  if (!code.includes(`title:"CRASH88"`)) {
    const marker = `{title:"Aviator"`;
    if (code.includes(marker)) {
      code = code.replace(marker, crash88Obj + "," + marker);
      fs.writeFileSync(filePath, code, "utf8");
      console.log(`Added CRASH88 to Crash category in ${path.basename(filePath)}`);
    }
  } else {
    console.log(`CRASH88 already present in ${path.basename(filePath)}`);
  }

  // Also make sure CRASH88 launches Aviator when clicked in kc
  if (code.includes('if(E==="Aviator"||E==="AVIATOR"') && !code.includes('CRASH88')) {
    code = code.replace(
      'if(E==="Aviator"||E==="AVIATOR"',
      'if(E==="Aviator"||E==="AVIATOR"||E==="CRASH88"'
    );
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`Updated kc click handler for CRASH88 in ${path.basename(filePath)}`);
  }
});
