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
    const yaRegex = /ya=\[\{amount:"(\d+)",displayOrig:"\1",total:"\1",bonusPercent:""\}(.*?)\]/g;
    code = code.replace(yaRegex, (match, firstAmt, rest) => {
      if (firstAmt !== "200") {
        modified = true;
        const item200 = `{amount:"200",displayOrig:"200",total:"200",bonusPercent:""}`;
        if (match.includes('amount:"200"')) {
          let clean = match.replace(/\{amount:"100",displayOrig:"100",total:"100",bonusPercent:""\},?/, "");
          clean = clean.replace(/ya=\[\{amount:"200"/, 'ya=[{amount:"200"');
          return clean;
        } else {
          let clean = match.replace(/\{amount:"100",displayOrig:"100",total:"100",bonusPercent:""\},?/, "");
          return `ya=[${item200},${clean.slice(4)}`;
        }
      }
      return match;
    });

    if (code.includes('{amount:"100",displayOrig:"100",total:"100",bonusPercent:""}')) {
      code = code.replaceAll('{amount:"100",displayOrig:"100",total:"100",bonusPercent:""},', "");
      code = code.replaceAll('{amount:"100",displayOrig:"100",total:"100",bonusPercent:""}', "");
      modified = true;
    }

    // 2. Minimum deposit validation check replace: ee=L?500:100 or ee=L?500:250 or ee=L?500:300 -> ee=L?500:200
    if (code.includes("ee=L?500:100")) {
      code = code.replaceAll("ee=L?500:100", "ee=L?500:200");
      modified = true;
    }
    if (code.includes("ee=L?500:250")) {
      code = code.replaceAll("ee=L?500:250", "ee=L?500:200");
      modified = true;
    }
    if (code.includes("ee=L?500:300")) {
      code = code.replaceAll("ee=L?500:300", "ee=L?500:200");
      modified = true;
    }

    code = code.replace(/ee=L\?500:(100|250|300|500)/g, "ee=L?500:200");

    // 3. Limit badge text
    code = code.replace(/children:"সীমা: ৳(১০০|২৫০|৩০০|৫০0) - ৳২৫,০০০"/g, 'children:"সীমা: ৳২০০ - ৳২৫,০০০"');

    // 4. Warning modal title text
    code = code.replace(/children:"(১০০|২৫০|৩০০) টাকা"\}\)," ডিপোজিট করেন"\]/g, 'children:"২০০ টাকা"})," ডিপোজিট করেন"]');

    // 5. Warning modal range text
    code = code.replace(/children:"(১০০|২৫০|৩০০) টাকা"\}\)," থেকে "/g, 'children:"২০০ টাকা"})," থেকে "');

    // 6. Warning modal note text
    code = code.replace(/পর্যন্ত। (১০০|২৫০|৩০০) টাকা ডিপোজিট করলে সাথে সাথে/g, 'পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে');

    // 7. Warning modal button click action
    code = code.replace(/onClick:\(\)=>\{fi\("(100|250|300)"\),be\(!1\)\}/g, 'onClick:()=>{fi("200"),be(!1)}');

    // 8. Warning modal button label
    code = code.replace(/"৳(১০০|২৫০|৩০০) সিলেক্ট করে এগিয়ে যান"/g, '"৳২০০ সিলেক্ট করে এগিয়ে যান"');

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

console.log(`Patched ${patchedCount} files in dist / dist_backup to min deposit 200.`);
