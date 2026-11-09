const fs = require("fs");
let code = fs.readFileSync("patch_full_deposit_fix.cjs", "utf8");
code = code.replace(/const newCb1 = `pass_through_callback_url:"\$\{CLOUD_RUN_BACKEND\}\/callback\.php"`;/g, 'const newCb1 = `pass_through_callback_url:"https://sn777.site/callback.php"`;');
fs.writeFileSync("patch_full_deposit_fix.cjs", code, "utf8");
