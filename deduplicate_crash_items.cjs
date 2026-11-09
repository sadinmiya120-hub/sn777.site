const fs = require("fs");
const path = require("path");

console.log("[Deduplicate Crash Items] Cleaning up duplicate items in Crash category...");

const targets = [
  path.join(__dirname, "dist/assets/index-sn777-v12.js"),
  path.join(__dirname, "dist_backup/assets/index-sn777-v12.js"),
  path.join(__dirname, "original-index-sn777-v5.js"),
  path.join(__dirname, "public/assets/index-sn777-v12.js")
];

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Regex to match game objects under category "ক্র্যাশ"
  const regex = /\{title:"([^"]+)",image:"([^"]+)",category:"ক্র্যাশ",isHot:([^}]+)\}/g;
  
  const seenTitles = new Set();
  const uniqueItems = [];

  // Parse all matches
  let match;
  while ((match = regex.exec(code)) !== null) {
    const title = match[1];
    const fullObjStr = match[0];
    if (!seenTitles.has(title)) {
      seenTitles.add(title);
      uniqueItems.push(fullObjStr);
    }
  }

  if (uniqueItems.length > 0) {
    // Replace all occurrences of items under category:"ক্র্যাশ" with uniqueItems list joined
    const joinedUnique = uniqueItems.join(",");
    // Replace the block of crash items with the deduplicated block
    code = code.replace(
      (/(\{title:"[^"]+",image:"[^"]+",category:"ক্র্যাশ",isHot:[^}]+\},?)+/g),
      joinedUnique + ","
    );
    // Cleanup any double commas like ","
    code = code.replace(/,+/g, ",");

    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[Deduplicate] Cleaned ${path.basename(filePath)}, unique items count: ${uniqueItems.length}`);
  }
});

try {
  const distFile = path.join(__dirname, "dist/assets/index-sn777-v12.js");
  const publicFile = path.join(__dirname, "public/assets/index-sn777-v12.js");
  const backupFile = path.join(__dirname, "dist_backup/assets/index-sn777-v12.js");
  if (fs.existsSync(distFile)) {
    fs.copyFileSync(distFile, publicFile);
    fs.copyFileSync(distFile, backupFile);
    console.log("[Deduplicate Sync] Synced dist to public and backup.");
  }
} catch (e) {
  console.error("[Deduplicate Sync Error]", e.message);
}
