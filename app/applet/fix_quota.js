const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const oldSnippet = `        const depSnap = await db.collection("deposits").where("uid", "==", uid).get();
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
        }`;

const newSnippet = `        try {
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
          console.log("Deposit query quota/error handled:", qErr?.message || qErr);
        }`;

if (code.includes(oldSnippet)) {
  code = code.replace(oldSnippet, newSnippet);
  fs.writeFileSync("server.ts", code, "utf8");
  console.log("Successfully replaced snippet in server.ts");
} else {
  console.log("oldSnippet not found in server.ts");
}
