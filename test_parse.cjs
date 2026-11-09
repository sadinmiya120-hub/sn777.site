const acorn = require('acorn');
const fs = require('fs');
let code = fs.readFileSync("dist_backup/assets/index-sn777-v5.js", "utf8");
try {
  acorn.parse(code, {ecmaVersion: 2020});
  console.log("Acorn parsing OK");
} catch(e) {
  console.log(e.message);
  console.log(code.substring(e.pos - 50, e.pos + 50));
}
