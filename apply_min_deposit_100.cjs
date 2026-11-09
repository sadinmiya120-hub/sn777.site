const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const assetDirs = ["dist/assets", "dist_backup/assets"];

let patchedCount = 0;

assetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (!file.endsWith(".js")) return;
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // 1. Update ya preset array for deposit amounts
    // Match ya=[{amount:"..." ... }]
    const yaRegex = /ya=\[\{amount:"(\d+)",displayOrig:"\1",total:"\1",bonusPercent:""\}(.*?)\]/g;
    code = code.replace(yaRegex, (match, firstAmt, rest) => {
      if (firstAmt !== "100") {
        modified = true;
        // If 100 is not already in the list, construct list starting with 100
        const item100 = `{amount:"100",displayOrig:"100",total:"100",bonusPercent:""}`;
        if (match.includes('amount:"100"')) {
          // move 100 to front if needed
          return match;
        } else {
          return `ya=[${item100},${match.slice(4)}`;
        }
      }
      return match;
    });

    // 2. Minimum deposit validation check replace: ee=L?500:200 or ee=L?500:250 or ee=L?500:300 -> ee=L?500:100
    if (code.includes("ee=L?500:200")) {
      code = code.replaceAll("ee=L?500:200", "ee=L?500:100");
      modified = true;
    }
    if (code.includes("ee=L?500:250")) {
      code = code.replaceAll("ee=L?500:250", "ee=L?500:100");
      modified = true;
    }
    if (code.includes("ee=L?500:300")) {
      code = code.replaceAll("ee=L?500:300", "ee=L?500:100");
      modified = true;
    }

    // Generic check for min deposit validation if formatted differently
    code = code.replace(/ee=L\?500:(200|250|300|500)/g, "ee=L?500:100");

    // 3. Limit badge text: "সীমা: ৳২০০ - ৳২৫,০০০" or "সীমা: ৳২৫০ - ৳২৫,০০০" -> "সীমা: ৳১০০ - ৳২৫,০০০"
    code = code.replace(/children:"সীমা: ৳(২০০|২৫০|৩০০|৫০0) - ৳২৫,০০০"/g, 'children:"সীমা: ৳১০০ - ৳২৫,০০০"');

    // 4. Warning modal title text
    code = code.replace(/children:"(২০০|২৫০|৩০০) টাকা"\}\)," ডিপোজিট করেন"\]/g, 'children:"১০০ টাকা"})," ডিপোজিট করেন"]');

    // 5. Warning modal range text
    code = code.replace(/children:"(২০০|২৫০|৩০০) টাকা"\}\)," থেকে "/g, 'children:"১০০ টাকা"})," থেকে "');

    // 6. Warning modal note text
    code = code.replace(/পর্যন্ত। (২০০|২৫০|৩০০) টাকা ডিপোজিট করলে সাথে সাথে/g, 'পর্যন্ত। ১০০ টাকা ডিপোজিট করলে সাথে সাথে');

    // 7. Warning modal button click action
    code = code.replace(/onClick:\(\)=>\{fi\("(200|250|300)"\),be\(!1\)\}/g, 'onClick:()=>{fi("100"),be(!1)}');

    // 8. Warning modal button label
    code = code.replace(/"৳(২০০|২৫০|৩০০) সিলেক্ট করে এগিয়ে যান"/g, '"৳১০০ সিলেক্ট করে এগিয়ে যান"');

    if (code !== fs.readFileSync(filePath, "utf8")) {
      modified = true;
    }

    if (modified) {
      try {
        esbuild.transformSync(code, { loader: "js" });
        fs.writeFileSync(filePath, code, "utf8");
        console.log(`[OK] Successfully patched ${filePath}`);
        patchedCount++;
      } catch (err) {
        console.error(`[ERROR] Syntax validation failed for ${filePath}:`, err);
      }
    }
  });
});

console.log(`Patched ${patchedCount} files in dist / dist_backup.`);
