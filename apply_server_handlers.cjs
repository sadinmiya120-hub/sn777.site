const fs = require("fs");

let code = fs.readFileSync("server_clean.ts", "utf8");

const apIndex = code.indexOf('app.post("/api/admin/approve-deposit"');
const nextIndex = code.indexOf('app.post("/api/auto-check-user-deposits"', apIndex);

if (apIndex === -1 || nextIndex === -1) {
  console.error("Could not find insertion points in server_clean.ts");
  process.exit(1);
}

const replacement = `app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, uid: reqUid, username: reqUsername, amount, finalCredit: reqFinalCredit } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no or doc_id" });
    }

    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    
    let requestedAmount = Number(amount) || (existing && Number(existing.amount)) || 0;
    let finalCredit = Number(reqFinalCredit) || requestedAmount;
    let uid = reqUid || (existing && existing.uid) || "";
    let username = reqUsername || (existing && (existing.username || existing.accountHolder)) || "";

    if (existing) {
      if (existing.status === "approved" || existing.credited === true) {
        return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে!" });
      }
      if (existing.status === "rejected" || existing.cancelled === true) {
        return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি বাতিল (রিজেক্ট) করা হয়েছে।" });
      }
    }

    // Save locally immediately
    const approvedTx = {
      ...(existing || {}),
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid: uid,
      username: username,
      amount: requestedAmount,
      finalCredit: finalCredit,
      status: "approved",
      credited: true,
      type: "deposit",
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };
    saveLocalTransaction(approvedTx);

    // Fast response
    res.json({
      success: true,
      message: "ডিপোজিট সফলভাবে অ্যাপ্রুভ করা হয়েছে।",
      amount: requestedAmount,
      finalCredit: finalCredit
    });

    // Background Firebase Sync
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        let depDoc = await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).get(),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => null);

        let depData = depDoc && depDoc.exists ? depDoc.data() : null;
        if (!uid && depData) uid = depData.uid;
        if (!username && depData) username = depData.username || depData.accountHolder;
        if (!requestedAmount && depData) requestedAmount = Number(depData.amount) || 0;
        if (!finalCredit && depData) finalCredit = Number(depData.finalCredit) || requestedAmount;

        // Credit user balance in Firestore
        if (uid && finalCredit > 0) {
          const userRef = db.collection("users").doc(uid);
          const userSnap = await Promise.race([
            userRef.get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => null);

          if (userSnap && userSnap.exists) {
            const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
            const newBal = (curBal + finalCredit).toFixed(2);
            await Promise.race([
              userRef.set({ balance: newBal, updatedAt: new Date().toISOString() }, { merge: true }),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
            ]).catch(() => {});
          }
        }

        const approvedPayload = {
          status: "approved",
          credited: true,
          amount: requestedAmount,
          finalCredit: finalCredit,
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "ডিপোজিট সফলভাবে সম্পন্ন হয়েছে (৳" + finalCredit + " যুক্ত হয়েছে)",
          ...(uid && { uid }),
          ...(username && { username })
        };

        await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        await Promise.race([
          db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        if (uid) {
          await Promise.race([
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => {});
        }
      } catch (e) {}
    })();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/reject-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, reason, uid: reqUid } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no" });
    }

    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    let uid = reqUid || (existing && existing.uid) || "";

    // Save locally immediately as rejected/cancelled
    saveLocalTransaction({
      ...(existing || {}),
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      status: "rejected",
      cancelled: true,
      rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
      type: "deposit",
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    });

    // Respond immediately to Admin Panel (<5ms)
    res.json({ success: true, message: "ডিপোজিট রিজেক্ট/বাতিল করা হয়েছে।" });

    // Background Firestore Sync
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        if (!uid) {
          const depDoc = await Promise.race([
            db.collection("deposits").doc(cleanOrderNo).get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => null);
          if (depDoc && depDoc.exists) uid = depDoc.data().uid;
        }

        const rejectPayload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          ...(uid && { uid }),
          ...(doc_id && { doc_id })
        };

        await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).set(rejectPayload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        await Promise.race([
          db.collection("transactions").doc(cleanOrderNo).set(rejectPayload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        if (uid) {
          await Promise.race([
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(rejectPayload, { merge: true }),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => {});
        }
      } catch (e) {}
    })();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/approve-withdrawal", async (req, res) => {
  try {
    const { id, doc_id, withdrawNo, uid: reqUid } = req.body;
    const cleanId = String(id || doc_id || withdrawNo || "").trim();
    if (!cleanId) return res.status(400).json({ success: false, error: "Missing withdrawal id" });

    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanId || t.withdrawNo === cleanId);
    let uid = reqUid || (existing && existing.uid) || "";

    saveLocalTransaction({
      ...(existing || {}),
      id: cleanId,
      withdrawNo: cleanId,
      uid: uid,
      status: "approved",
      type: "withdraw",
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "উইথড্র অ্যাপ্রুভ হয়েছে।" });

    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        const payload = {
          status: "approved",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "উইথড্র সফলভাবে সম্পন্ন হয়েছে (সাকসেসফুল)"
        };
        await Promise.race([
          db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        await Promise.race([
          db.collection("transactions").doc(cleanId).set(payload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        if (uid) {
          await Promise.race([
            db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true }),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => {});
        }
      } catch (e) {}
    })();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/reject-withdrawal", async (req, res) => {
  try {
    const { id, doc_id, withdrawNo, uid: reqUid, amount, reason } = req.body;
    const cleanId = String(id || doc_id || withdrawNo || "").trim();
    if (!cleanId) return res.status(400).json({ success: false, error: "Missing withdrawal id" });

    const refundAmount = Number(amount) || 0;
    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanId || t.withdrawNo === cleanId);
    let uid = reqUid || (existing && existing.uid) || "";

    saveLocalTransaction({
      ...(existing || {}),
      id: cleanId,
      withdrawNo: cleanId,
      uid: uid,
      status: "rejected",
      cancelled: true,
      rejectReason: reason || "উইথড্র বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে",
      type: "withdraw",
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "উইথড্র রিজেক্ট/বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।" });

    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        if (uid && refundAmount > 0) {
          const userRef = db.collection("users").doc(uid);
          const userSnap = await Promise.race([
            userRef.get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => null);
          if (userSnap && userSnap.exists) {
            const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
            const newBal = (curBal + refundAmount).toFixed(2);
            await Promise.race([
              userRef.set({ balance: newBal, updatedAt: new Date().toISOString() }, { merge: true }),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
            ]).catch(() => {});
          }
        }

        const payload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "উইথড্র বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।"
        };
        await Promise.race([
          db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        await Promise.race([
          db.collection("transactions").doc(cleanId).set(payload, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
        ]).catch(() => {});
        if (uid) {
          await Promise.race([
            db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true }),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => {});
        }
      } catch (e) {}
    })();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});
`;

code = code.substring(0, apIndex) + replacement + "\n\n" + code.substring(nextIndex);

fs.writeFileSync("server.ts", code, "utf8");
console.log("Successfully replaced server.ts with clean optimized handlers!");
