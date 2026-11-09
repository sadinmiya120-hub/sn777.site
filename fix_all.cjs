const fs = require("fs");
const esbuild = require("esbuild");

async function fix() {
    let code = fs.readFileSync("dist_backup/assets/index-sn777-v5.js", "utf8");
    let regex = /children:"বাতিল করুন"\}\)\}\)\].*?"payment-screen"\)/;
    let match = code.match(regex);
    if(match) {
        let endings = [
            `children:"বাতিল করুন"})]})]}},"payment-screen")`,
            `children:"বাতিল করুন"})]})]},"payment-screen")`,
            `children:"বাতিল করুন"})]})]}),"payment-screen")`,
            `children:"বাতিল করুন"})]})]}}),"payment-screen")`,
            `children:"বাতিল করুন"})]})]}]},"payment-screen")`,
            `children:"বাতিল করুন"})]})]}]}),"payment-screen")`,
            `children:"বাতিল করুন"})]})]}}]},"payment-screen")`,
        ];
        
        for (let ending of endings) {
            let testCode = code.replace(regex, ending);
            try {
                await esbuild.transform(testCode, { loader: 'js' });
                console.log("Success with:", ending);
                fs.writeFileSync("dist_backup/assets/index-sn777-v5.js", testCode);
                fs.writeFileSync("dist/assets/index-sn777-v5.js", testCode);
                return;
            } catch(e) {}
        }
        console.log("None of the endings worked.");
    } else {
        console.log("Not found.");
    }
}
fix();
