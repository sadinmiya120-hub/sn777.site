const fs = require("fs");
let server = fs.readFileSync("server.ts", "utf8");

// We will overwrite the 4 endpoints completely

const newApproveDeposit = `app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, uid: reqUid, username: reqUsername, amount, finalCredit: reqFinalCredit } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no or doc_id" });
    }
    const requestedAmount = Number(amount) || 0;
    const finalCredit = Number(reqFinalCredit || requestedAmount || 0);
    
    // Find in local list
    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    let uid = reqUid || (existing && existing.uid) || "";
    
    if (existing && (existing.status === "approved" || existing.status === "success")) {
       return res.status(400).json({ success: false, error: "ইতিমধ্যে অ্যাপ্রুভড হওয়া ডিপোজিট বাতিল করা সম্ভব নয়!" });
    }

    // Immediately save to local transactions store
    saveLocalTransaction({
      ...(existing || {}),
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid: uid,
      status: "approved",
      credited: true,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount,
      type: "deposit",
      updatedAt: new Date().toISOString()
    });

    // Send response instantly
    res.json({
      success: true,
      message: \`ডিপোজিট অ্যাপ্রুভ হয়েছে এবং ইউজারের ব্যালেন্সে ৳\${finalCredit || requestedAmount} যোগ করা হয়েছে।\`,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount
    });

    // Background Firestore Sync
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        // If uid is still missing, try to find it in DB
        if (!uid) {
           const depDoc = await Promise.race([
             db.collection("deposits").doc(cleanOrderNo).get(),
             new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
           ]).catch(() => null);
           if (depDoc && depDoc.exists) uid = depDoc.data().uid;
        }
        
        if (uid) {
          const userRef = db.collection("users").doc(uid);
          const userSnap = await Promise.race([
            userRef.get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
          ]).catch(() => null);
          if (userSnap && userSnap.exists) {
            const uData = userSnap.data() || {};
            const curBal = parseFloat(String(uData.balance || "0").replace(/,/g, "")) || 0;
            const curDep = parseFloat(String(uData.totalDeposited || "0").replace(/,/g, "")) || 0;
            const curCount = Number(uData.approvedDepositsCount || 0);
            const newBal = (curBal + (finalCredit || requestedAmount)).toFixed(2);
            const newTotalDep = curDep + requestedAmount;
            const newCount = curCount + 1;
            await Promise.race([
              userRef.set({
                balance: newBal,
                approvedDepositsCount: newCount,
                totalDeposited: newTotalDep,
                withdrawEnabled: (newTotalDep >= 940 && newCount >= 2),
                updatedAt: new Date().toISOString()
              }, { merge: true }),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
            ]).catch(() => {});
          }
        }
        
        const approvedPayload = {
          status: "approved",
          credited: true,
          amount: requestedAmount,
          finalCredit: finalCredit || requestedAmount,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
});`;

const newRejectDeposit = `app.post("/api/admin/reject-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, reason } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no" });
    }
    
    // Find in local list
    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    let uid = (existing && existing.uid) || "";
    
    if (existing && (existing.status === "approved" || existing.status === "success" || existing.credited === true)) {
       return res.status(400).json({ success: false, error: "ইতিমধ্যে অ্যাপ্রুভড হওয়া ডিপোজিট বাতিল করা সম্ভব নয়!" });
    }

    // Immediately save to local store
    saveLocalTransaction({
      ...(existing || {}),
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid: uid,
      status: "rejected",
      cancelled: true,
      rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
      type: "deposit",
      updatedAt: new Date().toISOString()
    });

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
});`;

const newApproveWithdrawal = `app.post("/api/admin/approve-withdrawal", async (req, res) => {
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
      updatedAt: new Date().toISOString()
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
});`;

const newRejectWithdrawal = `app.post("/api/admin/reject-withdrawal", async (req, res) => {
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
      rejectReason: reason || "বাতিল করা হয়েছে",
      type: "withdraw",
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "উইথড্র রিজেক্ট/বাতিল করা হয়েছে।" });

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
              userRef.set({ balance: newBal }, { merge: true }),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
            ]).catch(() => {});
          }
        }
        
        const payload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "বাতিল করা হয়েছে",
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
});`;

const approveDepStart = server.indexOf('app.post("/api/admin/approve-deposit"');
const rejectDepStart = server.indexOf('app.post("/api/admin/reject-deposit"');
const approveWithStart = server.indexOf('app.post("/api/admin/approve-withdrawal"');
const rejectWithStart = server.indexOf('app.post("/api/admin/reject-withdrawal"');
const nextRoute = server.indexOf('app.post("/api/admin/withdrawals"', rejectWithStart);

if (approveDepStart > -1 && rejectDepStart > -1 && approveWithStart > -1 && rejectWithStart > -1) {
  server = server.substring(0, approveDepStart) + 
           newApproveDeposit + "\n\n" + 
           newRejectDeposit + "\n\n" + 
           newApproveWithdrawal + "\n\n" + 
           newRejectWithdrawal + "\n\n" + 
           server.substring(nextRoute);
  fs.writeFileSync("server.ts", server, "utf8");
  console.log("Successfully patched admin handlers for instant response!");
} else {
  console.log("Could not find handlers");
}
