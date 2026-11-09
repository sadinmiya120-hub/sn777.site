const fs = require("fs");
let server = fs.readFileSync("server.ts", "utf8");

// We need to patch approve-deposit, reject-deposit, approve-withdrawal, reject-withdrawal
// Let's use regex to find and replace the DB blocks

server = server.replace(
  /const adminApp = getFirebaseAdmin\(\);[\s\S]*?saveLocalTransaction/g,
  (match) => {
    // If it's the one inside record-transaction, it's already async
    if (match.includes("(async () => {")) return match;
    
    // Otherwise, wrap the Firebase part in async IIFE
    const fbPart = match.substring(0, match.lastIndexOf("saveLocalTransaction"));
    return `// Background Firebase sync to avoid 20s timeouts
    (async () => {
      ${fbPart}
    })();
    saveLocalTransaction`;
  }
);

fs.writeFileSync("server.ts", server, "utf8");
console.log("Fixed server.ts timeouts");
