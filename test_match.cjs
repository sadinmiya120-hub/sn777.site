const fs = require("fs");
let code = fs.readFileSync("dist/assets/index-sn777-v5.js", "utf8");

let targetStart = code.indexOf(`o.jsxs("div",{className:"max-w-md mx-auto space-y-6",children:[o.jsxs("div",{className:"flex items-start justify-between"`);
if (targetStart === -1) {
    console.log("Start not found");
} else {
    let targetEnd = code.indexOf(`},"payment-screen")`, targetStart);
    console.log("Start:", targetStart, "End:", targetEnd);
    console.log("Length:", targetEnd - targetStart);
}
