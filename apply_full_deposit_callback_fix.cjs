const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Ensure top-level isGenericUid helper is present
if (!serverCode.includes('function isGenericUid(')) {
  const isGenericDef = `
function isGenericUid(u: any): boolean {
  if (!u) return true;
  const str = String(u).trim().toLowerCase();
  return (
    str === "" ||
    str === "sn777_user" ||
    str === "sn777" ||
    str === "user" ||
    str === "null" ||
    str === "undefined" ||
    str === "সম্পূর্ণ নাম" ||
    str === "ব্যবহারকারী" ||
    str.startsWith("guest_")
  );
}
`;
  serverCode = isGenericDef + "\n" + serverCode;
}

// 2. Replace approveAndCreditDeposit implementation
const approveOldStart = serverCode.indexOf('function approveAndCreditDeposit(');
if (approveOldStart !== -1) {
  const approveOldEnd = serverCode.indexOf('// Background reconciler to automatically credit', approveOldStart);
  if (approveOldEnd !== -1) {
    const newApproveCode = `function approveAndCreditDeposit(orderNoInput: string, paidAmountOverride?: number, reqUid?: string) {
  const cleanOrderNo = String(orderNoInput || "").trim();
  if (!cleanOrderNo) return null;

  const localList = getLocalTransactions();
  const existingLocal = localList.find((t: any) =>
    t.id === cleanOrderNo || t.order_no === cleanOrderNo || t.depositNo === cleanOrderNo || t.serialNo === cleanOrderNo
  );

  let amount = paidAmountOverride || Number(existingLocal?.amount) || 0;
  
  let candidateUid = !isGenericUid(reqUid) ? reqUid : "";
  if (isGenericUid(candidateUid)) {
    candidateUid = !isGenericUid(existingLocal?.uid) ? existingLocal.uid : "";
  }
  let candidateUsername = existingLocal?.username || "";
  let phone = existingLocal?.phone || existingLocal?.userPhone || "";

  const adminApp = getFirebaseAdmin();
  let db: any = null;
  let depData: any = null;

  if (adminApp) {
    try {
      db = adminApp.firestore();
      const depRef = db.collection("deposits").doc(cleanOrderNo);
      const depSnap = await Promise.race([
        depRef.get(),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))
      ]).catch(() => null);

      if (depSnap && depSnap.exists) {
        depData = depSnap.data();
      } else {
        const qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get().catch(() => null);
        if (qSnap && !qSnap.empty) {
          depData = qSnap.docs[0].data();
        }
      }

      if (depData) {
        if (isGenericUid(candidateUid)) {
          candidateUid = !isGenericUid(depData.uid) ? depData.uid : (!isGenericUid(depData.user_id) ? depData.user_id : "");
        }
        if (!candidateUsername || candidateUsername === "User" || candidateUsername === "sn777_user") {
          candidateUsername = depData.username || depData.accountHolder || depData.user || "";
        }
        if (!amount) amount = Number(depData.amount) || Number(depData.finalCredit) || 0;
        if (!phone) phone = depData.phone || depData.userPhone || "";
      }
    } catch (e) {
      console.warn("[approveAndCreditDeposit] Error reading deposit doc:", e);
    }
  }

  // Idempotency check: Has user balance ALREADY been credited for this deposit to THIS candidateUid?
  const alreadyCreditedToRealUser = (
    (existingLocal && existingLocal.balanceCredited === true && existingLocal.creditedUid && !isGenericUid(existingLocal.creditedUid) && existingLocal.creditedUid === candidateUid) ||
    (depData && depData.balanceCredited === true && depData.creditedUid && !isGenericUid(depData.creditedUid) && depData.creditedUid === candidateUid)
  );

  let targetUid = candidateUid;
  let updatedBalance = "";

  if (!alreadyCreditedToRealUser && amount > 0) {
    try {
      // 1. Update local store & in-memory trackers immediately for all key aliases
      if (candidateUid && !isGenericUid(candidateUid)) {
        const curLocalBal = getLocalUserBalance(candidateUid);
        const newBal = (curLocalBal + amount).toFixed(2);
        updatedBalance = newBal;
        updateLocalUserBalance(candidateUid, newBal, amount);
      }
      if (candidateUsername && candidateUsername !== candidateUid && !isGenericUid(candidateUsername)) {
        const curLocalBal = getLocalUserBalance(candidateUsername);
        const newBal = (curLocalBal + amount).toFixed(2);
        updateLocalUserBalance(candidateUsername, newBal, amount);
      }

      // 2. Update Firestore database
      if (db) {
        let userDocRef: any = null;
        let userSnap: any = null;

        if (candidateUid && !isGenericUid(candidateUid)) {
          const snap = await db.collection("users").doc(candidateUid).get().catch(() => null);
          if (snap && snap.exists) {
            userDocRef = db.collection("users").doc(candidateUid);
            userSnap = snap;
            targetUid = candidateUid;
          }
        }

        if (!userSnap) {
          const searchName = candidateUsername || candidateUid;
          if (searchName && !isGenericUid(searchName)) {
            const qSnap = await db.collection("users").where("username", "==", searchName).limit(1).get().catch(() => null);
            if (qSnap && !qSnap.empty) {
              userDocRef = qSnap.docs[0].ref;
              userSnap = qSnap.docs[0];
              targetUid = qSnap.docs[0].id;
            }
          }
        }

        if (!userSnap && candidateUid && candidateUid.includes("@")) {
          const qSnap = await db.collection("users").where("email", "==", candidateUid).limit(1).get().catch(() => null);
          if (qSnap && !qSnap.empty) {
            userDocRef = qSnap.docs[0].ref;
            userSnap = qSnap.docs[0];
            targetUid = qSnap.docs[0].id;
          }
        }

        if (!userSnap && phone) {
          const cleanP = phone.replace(/\\D/g, "");
          if (cleanP.length >= 10) {
            const qSnap = await db.collection("users").where("phone", "in", [phone, cleanP, "+880 " + cleanP, "+880" + cleanP]).limit(1).get().catch(() => null);
            if (qSnap && !qSnap.empty) {
              userDocRef = qSnap.docs[0].ref;
              userSnap = qSnap.docs[0];
              targetUid = qSnap.docs[0].id;
            }
          }
        }

        if (userSnap && userSnap.exists && userDocRef) {
          const uData = userSnap.data() || {};
          const curBal = parseFloat(String(uData.balance || "0").replace(/,/g, "")) || 0;
          const fsNewBal = (curBal + amount).toFixed(2);
          const curDep = parseFloat(String(uData.totalDeposited || "0").replace(/,/g, "")) || 0;
          const curCount = Number(uData.approvedDepositsCount || 0);

          await userDocRef.set({
            balance: fsNewBal,
            approvedDepositsCount: curCount + 1,
            totalDeposited: curDep + amount,
            withdrawEnabled: ((curDep + amount) >= 940 && (curCount + 1) >= 2),
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});

          updatedBalance = fsNewBal;
          updateLocalUserBalance(targetUid, fsNewBal, amount);
          if (uData.username) updateLocalUserBalance(uData.username, fsNewBal, amount);
          console.log(\`[approveAndCreditDeposit] SUCCESS! Credited ৳\${amount} to Firestore user \${targetUid} (\${uData.username || candidateUsername}). New bal: ৳\${fsNewBal}\`);
        } else {
          console.warn(\`[approveAndCreditDeposit] WARNING: Firestore user doc not found for uid: "\${candidateUid}", username: "\${candidateUsername}". Saved to local store!\`);
        }
      }
    } catch (uErr) {
      console.error("[approveAndCreditDeposit] Error updating user balance:", uErr);
    }
  }

  const finalUid = !isGenericUid(targetUid) ? targetUid : (!isGenericUid(candidateUid) ? candidateUid : "");

  // Save local transaction state
  const updatedLocal = {
    ...(existingLocal || {}),
    id: cleanOrderNo,
    order_no: cleanOrderNo,
    orderId: cleanOrderNo,
    depositNo: cleanOrderNo,
    serialNo: cleanOrderNo,
    uid: finalUid,
    username: candidateUsername || existingLocal?.username || "User",
    phone: phone,
    amount: amount,
    finalCredit: amount,
    status: "approved",
    credited: true,
    balanceCredited: true,
    creditedUid: finalUid,
    type: "deposit",
    updatedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString()
  };
  saveLocalTransaction(updatedLocal);

  // Sync deposit records to Firestore
  if (db) {
    try {
      const approvedPayload = {
        id: cleanOrderNo,
        order_no: cleanOrderNo,
        orderId: cleanOrderNo,
        depositNo: cleanOrderNo,
        serialNo: cleanOrderNo,
        status: "approved",
        credited: true,
        balanceCredited: true,
        creditedUid: finalUid,
        amount: amount,
        finalCredit: amount,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(finalUid && { uid: finalUid })
      };
      await Promise.allSettled([
        db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        finalUid ? db.collection("users").doc(finalUid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }) : Promise.resolve()
      ]);
    } catch (fbErr) {
      console.warn("[approveAndCreditDeposit] Firestore deposit sync warning:", fbErr);
    }
  }

  return updatedLocal;
}
`;
    serverCode = serverCode.substring(0, approveOldStart) + newApproveCode + "\n" + serverCode.substring(approveOldEnd);
  }
}

// 3. Replace GoPay Callback Endpoint
const callbackStart = serverCode.indexOf('// GoPay Webhook Callback Notification');
if (callbackStart !== -1) {
  const callbackEnd = serverCode.indexOf('// Payment Return / Success Page', callbackStart);
  if (callbackEnd !== -1) {
    const newCallbackCode = `// GoPay Webhook Callback Notification (gopay_notify.php / callback.php / notify_url)
app.all(["/gopay_notify.php", "/callback.php", "/notify.php", "/gopay_callback.php", "/api/gopay-notify", "/api/gopay-callback", "/api/propay-callback"], async (req, res) => {
  try {
    const rawData = extractCallbackData(req);
    if (!rawData || Object.keys(rawData).length === 0) {
      console.warn("[GoPay Callback] Empty payload received");
      return res.send("fail");
    }

    const order_no = String(rawData.mchOrderNo || rawData.mch_order_no || rawData.order_no || rawData.out_trade_no || "").trim();
    const amount = parseFloat(String(rawData.amount || rawData.trade_amount || 0)) || 0;
    const tradeNo = String(rawData.tradeNo || rawData.trade_no || "");
    const callbackUid = String(rawData.mch_return_msg || rawData.mchReturnMsg || rawData.uid || "").trim();

    const localList = getLocalTransactions();
    const existingLocalTx = localList.find((item: any) =>
      item.id === order_no || item.order_no === order_no || (tradeNo && (item.tradeNo === tradeNo || item.id === tradeNo))
    );

    const targetUid = !isGenericUid(callbackUid) ? callbackUid : (!isGenericUid(existingLocalTx?.uid) ? existingLocalTx.uid : "");
    const paidAmount = amount > 0 ? amount : (Number(existingLocalTx?.amount) || 0);

    const tradeResult = String(rawData.tradeResult || rawData.trade_result || rawData.status || rawData.trade_status || rawData.respCode || rawData.code || "").toUpperCase();
    const isTradeSuccess = tradeResult === "1" || tradeResult === "SUCCESS" || tradeResult === "TRADE_SUCCESS" || tradeResult === "0000" || tradeResult === "00" || tradeResult === "0" || tradeResult === "200" || tradeResult === "SUCCESSFUL" || String(rawData.respCode).toUpperCase() === "SUCCESS";

    console.log(\`[GoPay Callback] Success capture for order: \${order_no}, amount: \${paidAmount}, targetUid: \${targetUid}\`);

    if (order_no) {
      await approveAndCreditDeposit(order_no, paidAmount, targetUid);
      return res.send("success");
    }

    return res.send("success");
  } catch (err: any) {
    console.error("[GoPay Callback Error]:", err);
    return res.send("fail");
  }
});
`;
    serverCode = serverCode.substring(0, callbackStart) + newCallbackCode + "\n" + serverCode.substring(callbackEnd);
  }
}

// 4. Update Reconciler function
const recStart = serverCode.indexOf('async function reconcileUncreditedApprovedDeposits()');
if (recStart !== -1) {
  const recEnd = serverCode.indexOf('// ===============', recStart);
  if (recEnd !== -1) {
    const newRecCode = `async function reconcileUncreditedApprovedDeposits() {
  try {
    const localList = getLocalTransactions();
    const approvedUncredited = localList.filter((t: any) =>
      t.type === "deposit" && (t.status === "approved" || t.credited === true) &&
      (t.balanceCredited !== true || isGenericUid(t.creditedUid) || isGenericUid(t.uid))
    );
    if (approvedUncredited.length > 0) {
      console.log(\`[Reconciler] Found \${approvedUncredited.length} approved deposits needing balance credit or UID fix. Reconciling...\`);
      for (const t of approvedUncredited) {
        const orderKey = String(t.order_no || t.id || "");
        if (orderKey) {
          await approveAndCreditDeposit(orderKey, Number(t.amount || t.finalCredit || 0), !isGenericUid(t.uid) ? t.uid : "");
        }
      }
    }

    const adminApp = getFirebaseAdmin();
    if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
      const db = adminApp.firestore();
      const snap = await db.collection("deposits").where("status", "==", "approved").limit(100).get().catch(() => null);
      if (snap && !snap.empty) {
        for (const doc of snap.docs) {
          const d = doc.data();
          if (d.balanceCredited !== true || isGenericUid(d.creditedUid) || isGenericUid(d.uid)) {
            console.log(\`[Reconciler] Found Firestore deposit #\${doc.id} approved but needing balance credit. Reconciling...\`);
            await approveAndCreditDeposit(doc.id, Number(d.amount || d.finalCredit || 0), !isGenericUid(d.uid) ? d.uid : "");
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[Reconciler] Error during deposit reconciliation:", err?.message || err);
  }
}
`;
    serverCode = serverCode.substring(0, recStart) + newRecCode + "\n" + serverCode.substring(recEnd);
  }
}

fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log("Successfully updated server.ts!");
