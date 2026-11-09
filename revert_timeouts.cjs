const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const badPrefix = "// Background Firebase sync to avoid 20s timeouts\n    (async () => {";
// Actually, it might be indented differently.
code = code.replace(/\/\/\s*Background Firebase sync to avoid 20s timeouts\s*\(\s*async\s*\(\)\s*=>\s*\{/g, "");
code = code.replace(/\}\)\(\);\s*saveLocalTransaction/g, "saveLocalTransaction");

fs.writeFileSync("server.ts", code, "utf8");
