const fs = require("fs");
const esbuild = require("esbuild");

const filesToPatch = [
  "dist_backup/assets/index-sn777-v10.js",
  "dist_backup/assets/index-sn777-v9.js",
  "dist_backup/assets/index-sn777-v8.js",
  "dist_backup/assets/index-sn777-v7.js",
  "dist_backup/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v10.js",
  "dist/assets/index-sn777-v9.js",
  "dist/assets/index-sn777-v8.js",
  "dist/assets/index-sn777-v7.js",
  "dist/assets/index-sn777-v6.js",
  "dist/assets/index-sn777-v5.js",
  "public/assets/index-sn777-v10.js"
];

const ya250 = `ya=[{amount:"250",displayOrig:"250",total:"250",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

const ya200 = `ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

const ya100 = `ya=[{amount:"100",displayOrig:"100",total:"100",bonusPercent:""},{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let code = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // 1. ya array update (from 250 or 200 to 100)
  if (code.includes(ya250)) {
    code = code.replaceAll(ya250, ya100);
    modified = true;
  }
  if (code.includes(ya200)) {
    code = code.replaceAll(ya200, ya100);
    modified = true;
  }
  if (code.includes('ya=[{amount:"250",displayOrig:"250"')) {
    code = code.replace(/ya=\[\{amount:"250",displayOrig:"250",total:"250",bonusPercent:""\}/g, '{amount:"100",displayOrig:"100",total:"100",bonusPercent:""}');
    modified = true;
  }
  if (code.includes('ya=[{amount:"200",displayOrig:"200"')) {
    code = code.replace(/ya=\[\{amount:"200",displayOrig:"200",total:"200",bonusPercent:""\}/g, '{amount:"100",displayOrig:"100",total:"100",bonusPercent:""}');
    modified = true;
  }

  // 2. Minimum deposit validation check ee=L?500:200 -> ee=L?500:100
  if (code.includes("ee=L?500:250")) {
    code = code.replaceAll("ee=L?500:250", "ee=L?500:100");
    modified = true;
  }
  if (code.includes("ee=L?500:200")) {
    code = code.replaceAll("ee=L?500:200", "ee=L?500:100");
    modified = true;
  }

  // 3. Limit badge text: সীমা: ৳২০০ - ৳২৫,০০০ -> সীমা: ৳১০০ - ৳২৫,০০০
  if (code.includes('children:"সীমা: ৳২৫০ - ৳২৫,০০০"')) {
    code = code.replaceAll('children:"সীমা: ৳২৫০ - ৳২৫,০০০"', 'children:"সীমা: ৳১০০ - ৳২৫,০০০"');
    modified = true;
  }
  if (code.includes('children:"সীমা: ৳২০০ - ৳২৫,০০০"')) {
    code = code.replaceAll('children:"সীমা: ৳২০০ - ৳২৫,০০০"', 'children:"সীমা: ৳১০০ - ৳২৫,০০০"');
    modified = true;
  }

  // 4. Warning modal title text
  if (code.includes('children:"২৫০ টাকা"})," ডিপোজিট করেন"]')) {
    code = code.replaceAll('children:"২৫০ টাকা"})," ডিপোজিট করেন"]', 'children:"১০০ টাকা"})," ডিপোজিট করেন"]');
    modified = true;
  }
  if (code.includes('children:"২০০ টাকা"})," ডিপোজিট করেন"]')) {
    code = code.replaceAll('children:"২০০ টাকা"})," ডিপোজিট করেন"]', 'children:"১০০ টাকা"})," ডিপোজিট করেন"]');
    modified = true;
  }

  // 5. Warning modal range text
  if (code.includes('children:"২৫০ টাকা"})," থেকে "')) {
    code = code.replaceAll('children:"২৫০ টাকা"})," থেকে "', 'children:"১০০ টাকা"})," থেকে "');
    modified = true;
  }
  if (code.includes('children:"২০০ টাকা"})," থেকে "')) {
    code = code.replaceAll('children:"২০০ টাকা"})," থেকে "', 'children:"১০০ টাকা"})," থেকে "');
    modified = true;
  }

  // 6. Warning modal note text
  if (code.includes('পর্যন্ত। ২৫০ টাকা ডিপোজিট করলে সাথে সাথে')) {
    code = code.replaceAll('পর্যন্ত। ২৫০ টাকা ডিপোজিট করলে সাথে সাথে', 'পর্যন্ত। ১০০ টাকা ডিপোজিট করলে সাথে সাথে');
    modified = true;
  }
  if (code.includes('পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে')) {
    code = code.replaceAll('পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে', 'পর্যন্ত। ১০০ টাকা ডিপোজিট করলে সাথে সাথে');
    modified = true;
  }

  // 7. Warning modal button click action
  if (code.includes('onClick:()=>{fi("250"),be(!1)}')) {
    code = code.replaceAll('onClick:()=>{fi("250"),be(!1)}', 'onClick:()=>{fi("100"),be(!1)}');
    modified = true;
  }
  if (code.includes('onClick:()=>{fi("200"),be(!1)}')) {
    code = code.replaceAll('onClick:()=>{fi("200"),be(!1)}', 'onClick:()=>{fi("100"),be(!1)}');
    modified = true;
  }

  // 8. Warning modal button label
  if (code.includes('"৳২৫০ সিলেক্ট করে এগিয়ে যান"')) {
    code = code.replaceAll('"৳২৫০ সিলেক্ট করে এগিয়ে যান"', '"৳১০০ সিলেক্ট করে এগিয়ে যান"');
    modified = true;
  }
  if (code.includes('"৳২০০ সিলেক্ট করে এগিয়ে যান"')) {
    code = code.replaceAll('"৳২০০ সিলেক্ট করে এগিয়ে যান"', '"৳১০০ সিলেক্ট করে এগিয়ে যান"');
    modified = true;
  }

  // 9. Quick deposit input placeholder if any
  if (code.includes('placeholder:"২০০"')) {
    code = code.replaceAll('placeholder:"২০০"', 'placeholder:"১০০"');
    modified = true;
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(filePath, code, "utf8");
      console.log(`[${filePath}] Updated minimum deposit to ৳100 successfully!`);
    } catch (err) {
      console.error(`[${filePath}] Validation error:`, err);
    }
  } else {
    console.log(`[${filePath}] No min deposit changes required or already ৳100.`);
  }
});
