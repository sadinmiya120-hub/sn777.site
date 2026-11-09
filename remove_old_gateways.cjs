const fs = require("fs");
const path = require("path");

const filesToPatch = [
  "dist/assets/index-sn777-v12.js",
  "dist_backup/assets/index-sn777-v12.js",
  "public/assets/index-sn777-v12.js"
];

for (const relPath of filesToPatch) {
  const filePath = path.join(__dirname, relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;

    // 1. Remove non-bkash/nagad methods from the main methods array
    // We look for the array starting with {id:"bkash" and remove everything after nagad until the end of array ]
    // We make it more specific to match exactly the array pattern we saw
    const methodsRegex = /\[\s*\{\s*id\s*:\s*\"bkash\"[\s\S]*?\}\s*,\s*\{\s*id\s*:\s*\"nagad\"[\s\S]*?\}\s*,[\s\S]*?\{[\s\S]*?\}\s*\]/;
    // If that doesn't match, try a simpler one but stop at the first ];
    const cleanMethods = '[{id:"bkash",name:"বিকাশ",color:"#e2136e",logo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4UEkhLBUdrPpR2LIahMVOX-QLJ1WG4J1qhr1UUXqDsJYu30zIBFnIuzxDCs5GXkxhvfbjYiiWUNi8hxAFjGCVyntU1_eJ0aGlAjBCPy_0sUgYbyViV9dinzv32zD9fJrdTHUv-sWXy-3AVQwxByAJYVKepxzGIOs6eri4O_UgKPUxSa5Gqkm_t4AbMuny/s554/images%20(18).jpeg"},{id:"nagad",name:"নগদ",color:"#f7941d",logo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-QTVs9eBas6GpK2ydqhcGMQylNU_pN-s36BYRmohiHGhQ1WatvM-iqpa1sjGrZIMl2qw0UNhtBFMeNATQy3PJW5z8Eet99916DdaTFQ7fXTGyfEthPITh57pDMhcU4aPXAVvXwMNCmF_h5xSOBP_tRoUzfED_jRU-tzOU0vJx19y_FYAe6C-7Z_7ajilj/s447/images%20(1).png"}]';
    
    if (content.includes('id:"rocket"')) {
       // Only patch if we see rocket still there
       const rocketRegex = /\{\s*id\s*:\s*\"rocket\"[\s\S]*?\}\s*,?/g;
       const upayRegex = /\{\s*id\s*:\s*\"upay\"[\s\S]*?\}\s*,?/g;
       const usdtRegex = /\{\s*id\s*:\s*\"usdt\"[\s\S]*?\}\s*,?/g;
       
       content = content.replace(rocketRegex, "");
       content = content.replace(upayRegex, "");
       content = content.replace(usdtRegex, "");
       // Clean up trailing commas in the array
       content = content.replace(/,\s*\]/g, "]");
       changed = true;
       console.log(`[Gateways] Removed old methods individually in ${relPath}`);
    }


    if (changed) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  }
}
