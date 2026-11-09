const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

let startIdx = code.indexOf("const depSnap = await db.collection(\"deposits\")");
if (startIdx !== -1) {
  let endIdx = code.indexOf("}", startIdx);
  // find closing brace of the loop
  let loopEndIdx = code.indexOf("}", code.indexOf("for (const doc of depSnap.docs)"));
  let fullLoopEnd = code.indexOf("}", loopEndIdx + 1);
  let veryEnd = code.indexOf("}", fullLoopEnd + 1);

  let targetBlock = code.substring(startIdx, veryEnd + 1);
  
  let safeBlock = `try {
          const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();
          for (const doc of depSnap.docs) {
            const parsed = doc.data();
            const order_no = doc.id;
            const isApproved = parsed.status === "approved" || parsed.status === "success";
            const isUnnotified = parsed.notified === false || parsed.notified !== true && (!parsed.notified || parsed.notified === "false");
            if (isApproved && isUnnotified) {
              const finalCredit = Number(parsed.finalCredit) || Number(parsed.creditedAmount) || Number(parsed.amount) || 0;
              const amount = Number(parsed.amount) || finalCredit;
              results.push({
                order_no,
                result: {
                  success: true,
                  status: "approved",
                  amount,
                  finalCredit
                }
              });
              await doc.ref.update({ notified: true });
            }
          }
        } catch (qErr: any) {
          console.log("Deposit query quota/error handled gracefully:", qErr?.message || qErr);
        }`;

  code = code.replace(targetBlock, safeBlock);
  fs.writeFileSync("server.ts", code, "utf8");
  console.log("Successfully updated server.ts with quota protection!");
} else {
  console.log("depSnap declaration not found.");
}
