import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
const appDir = process.cwd();
import admin from "firebase-admin";
import crypto from "crypto";
import cron from 'node-cron';

import multer from "multer";
const upload = multer();

// Create server
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin initialization (lazy)
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawKey && rawKey.trim() !== "{}" && rawKey.trim() !== "") {
      try {
        const serviceAccount = JSON.parse(rawKey);
        if (serviceAccount && serviceAccount.project_id) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as any)
          });
        }
      } catch (e: any) {
        console.error("Firebase Admin init error:", e);
      }
    }
  }
  return admin.apps.length > 0 ? admin : null;
}

// Firebase Authentication Proxy to bypass ISP, DNS, or browser-level blocks on identitytoolkit/securetoken
app.all("/api/auth-proxy/:host/*", async (req, res) => {
  try {
    const { host } = req.params;
    const urlParts = req.url.split(`/api/auth-proxy/${host}/`);
    const pathAndQuery = urlParts[1] || "";
    const targetUrl = `https://${host}/${pathAndQuery}`;
    
    console.log(`[Auth Proxy] Forwarding request to: ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Forward important headers from client
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'cookie', 'origin', 'referer', 'accept-encoding'].includes(key.toLowerCase())) {
        continue;
      }
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const hasBody = !['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length > 0;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: hasBody ? JSON.stringify(req.body) : undefined
    });

    const bodyText = await response.text();
    
    res.status(response.status);

    // Forward response headers back to client
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection', 'content-security-policy', 'access-control-allow-origin'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.send(bodyText);
  } catch (err: any) {
    console.error("[Auth Proxy Error]:", err);
    res.status(500).json({ error: "Auth Proxy failed", message: err.message });
  }
});

// Password Reset Endpoint
app.post("/api/reset-password", async (req, res) => {
  try {
    
      const adminApp = getFirebaseAdmin();
    const { phone, newPassword, username } = req.body;

    if (!phone || !newPassword || !username) {
      return res.status(400).json({ error: "Missing phone, newPassword, or username" });
    }

    const formattedPhone = `+880 ${phone}`;
    
    // We need to find the user in Firestore users collection
    const db = adminApp.firestore();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("phone", "==", formattedPhone).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: "User not found with this phone number." });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    console.log(`Found user in Firestore with ID: ${userDoc.id}, phone: ${userData.phone}, username: ${userData.username}`);
    
    if (userData.username.toLowerCase() !== username.toLowerCase()) {
      console.log(`Username mismatch: Expected ${username}, Found ${userData.username}`);
      return res.status(400).json({ error: "ইউজারনেম এবং ফোন নাম্বার মিলছে না!" });
    }

    const userId = userDoc.id; // Same as auth uid

    // Try to update their password in Auth and Firestore
    console.log(`Attempting to update password for user ID: ${userId}`);
    let userRec;
    try {
        userRec = await adminApp.auth().getUser(userId);
        console.log(`User found in Auth: ${userId}, Email: ${userRec.email}`);
        
        // 1. Update Auth
        await adminApp.auth().updateUser(userId, {
          password: newPassword
        });
        
        // Revoke refresh tokens to force logout
        await adminApp.auth().revokeRefreshTokens(userId);
        
        // 2. Update Firestore
        await usersRef.doc(userId).update({
          password: newPassword
        });

        console.log(`Password updated in both Auth and Firestore for user ID: ${userId}`);
    } catch(e: any) {
        console.error(`Error updating user: ${e.message}`);
        throw e;
    }
    
    res.json({ success: true, message: "Password updated successfully!", email: userRec?.email });
  } catch (err: any) {
    console.error("Password reset error:", err);
    console.error("Error stack:", err.stack);
    if (err.message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return res.status(500).json({ error: "সিস্টেমটি সক্রিয় করতে অনুগ্রহ করে সেটিংস থেকে Service Account Key টি যুক্ত করুন।" });
    }
    res.status(500).json({ error: "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।" });
  }
});

// Update Username Endpoint
app.post("/api/update-username", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername } = req.body;

    if (!uid || !newUsername) {
      return res.status(400).json({ error: "Missing uid or newUsername" });
    }

    const newEmail = `${newUsername.toLowerCase()}@sn777.com`;

    console.log(`Attempting to update Auth email for user: ${uid} to ${newEmail}`);
    
    await adminApp.auth().updateUser(uid, {
      email: newEmail
    });

    res.json({ success: true, message: "Username (Auth email) updated successfully!" });
  } catch (err: any) {
    console.error("Username update error:", err);
    res.status(500).json({ error: "ইউজারনেম আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});


// --- Transaction Storage & Verification ---

const TX_STORE_FILE = path.join(process.cwd(), "data", "transactions_store.json");

function getLocalTransactions(): any[] {
  try {
    if (fs.existsSync(TX_STORE_FILE)) {
      return JSON.parse(fs.readFileSync(TX_STORE_FILE, "utf8")) || [];
    }
  } catch (e) {}
  return [];
}

function 
    saveLocalTransaction(tx: any) {
  try {
    const list = getLocalTransactions();
    // Sanitize any ProPay- prefix
    if (tx.transactionId && String(tx.transactionId).startsWith("ProPay-")) {
      tx.transactionId = String(tx.transactionId).replace(/^ProPay-/i, "");
    }
    if (tx.order_no && String(tx.order_no).startsWith("ProPay-")) {
      tx.order_no = String(tx.order_no).replace(/^ProPay-/i, "");
    }
    if (tx.id && String(tx.id).startsWith("ProPay-")) {
      tx.id = String(tx.id).replace(/^ProPay-/i, "");
    }
    const docKey = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || (tx.timestamp + "_" + tx.amount);
    const idx = list.findIndex((item: any) => {
      const k = item.id || item.order_no || item.depositNo || item.withdrawNo || (item.timestamp + "_" + item.amount);
      return k === docKey || (tx.order_no && item.order_no === tx.order_no) || (tx.id && item.id === tx.id);
    });
    if (idx >= 0) {
      const existing = list[idx];
      const isApproved = existing.status === "approved" || existing.status === "success" || existing.status === 1 || existing.credited === true ||
                         tx.status === "approved" || tx.status === "success" || tx.status === 1 || tx.credited === true;
      const isRejected = !isApproved && (existing.status === "rejected" || existing.status === "cancelled" || existing.status === "failed" || existing.status === 2 ||
                         tx.status === "rejected" || tx.status === "cancelled" || tx.status === "failed" || tx.status === 2);
      list[idx] = {
        ...existing,
        ...tx,
        status: isApproved ? "approved" : (isRejected ? "cancelled" : (tx.status || existing.status || "pending")),
        credited: isApproved ? true : (tx.credited || existing.credited || false),
        updatedAt: new Date().toISOString()
      };
    } else {
      list.unshift({ ...tx, createdAt: tx.createdAt || tx.timestamp || new Date().toISOString() });
    }
    const trimmed = list.slice(0, 1000);
    fs.writeFileSync(TX_STORE_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save local transaction:", e);
  }
}

async function fixUnknownUsernamesInDb() {
  try {
    const localList = getLocalTransactions();
    let updatedLocal = false;
    for (const tx of localList) {
      if (!tx.username || tx.username === "unknown") {
        const fallbackName = tx.uid && tx.uid !== "unknown" ? tx.uid : "User";
        tx.username = fallbackName;
        updatedLocal = true;
      }
    }
    if (updatedLocal) {
      fs.writeFileSync(TX_STORE_FILE, JSON.stringify(localList, null, 2), "utf8");
    }

    
      const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    const db = adminApp.firestore();

    const depSnap = await db.collection("deposits").where("username", "==", "unknown").limit(10).get();
    for (const dDoc of depSnap.docs) {
      const dData = dDoc.data();
      const uName = dData.uid && dData.uid !== "unknown" ? dData.uid : "User";
      await dDoc.ref.update({ username: uName }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.code === 8 || err?.message?.includes("Quota exceeded")) {
      // Gracefully handle Firestore quota limit without spamming error logs
      return;
    }
    console.warn("fixUnknownUsernamesInDb status:", err?.message || err);
  }
}

setTimeout(() => {
  fixUnknownUsernamesInDb();
}, 3000);


// Endpoint to record transaction persistently
app.post("/api/record-transaction", async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || !tx.uid) {
      return res.status(400).json({ error: "Missing tx data or uid" });
    }

    let safeTx = { ...tx };
    if (safeTx.transactionId) {
      safeTx.transactionId = String(safeTx.transactionId).replace(/^ProPay-/i, "");
    }
    if (safeTx.order_no) {
      safeTx.order_no = String(safeTx.order_no).replace(/^ProPay-/i, "");
    }
    if (safeTx.id) {
      safeTx.id = String(safeTx.id).replace(/^ProPay-/i, "");
    }
    const docId = safeTx.id || safeTx.order_no || safeTx.depositNo || safeTx.withdrawNo || ("tx_" + Date.now());
    safeTx.id = String(docId);
    safeTx.order_no = safeTx.order_no || String(docId);
    safeTx.transactionId = safeTx.transactionId || safeTx.order_no || String(docId);
    safeTx.timestamp = safeTx.timestamp || safeTx.createdAt || new Date().toISOString();
    safeTx.createdAt = safeTx.createdAt || safeTx.timestamp;
    safeTx.amount = Number(safeTx.amount || 0);
    safeTx.finalCredit = Number(safeTx.finalCredit || safeTx.amount || 0);
    if (!safeTx.username || safeTx.username === "User") {
      safeTx.username = tx.username || tx.name || tx.uid || "User";
    }

    // Security check: Client cannot arbitrarily mark deposits as "approved"
    if (safeTx.type === "deposit") {
      const localList = getLocalTransactions();
      const existing = localList.find((item: any) => (item.id === docId || item.order_no === docId));
      if (!existing || existing.status !== "approved") {
        safeTx.status = "pending";
      }
    }

    
    saveLocalTransaction(safeTx);

    // Asynchronously sync to Firestore if admin app exists without blocking response
    (async () => {
      try {
        
      const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          if (safeTx.type === "deposit") {
            const depRef = db.collection("deposits").doc(String(docId));
            await Promise.race([
              depRef.set(safeTx, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500))
            ]).catch(() => {});
          } else if (safeTx.type === "withdraw") {
            await Promise.race([
              db.collection("withdrawals").doc(String(docId)).set(safeTx, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500))
            ]).catch(() => {});
          }
          await Promise.race([
            db.collection("transactions").doc(String(docId)).set(safeTx, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500))
          ]).catch(() => {});
        }
      } catch (fbErr: any) {}
    })();

    return res.json({ success: true, status: safeTx.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch all deposits for Admin Panel fallback

// Endpoint to fetch all withdrawals for Admin Panel fallback
app.get("/api/admin/all-withdrawals", async (req, res) => {
  try {
    const localList = getLocalTransactions().filter((tx: any) => tx.type === "withdraw" || tx.withdrawNo || (tx.order_no && String(tx.order_no).startsWith("WTH")));
    let firestoreList: any[] = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const wthSnap = await adminApp.firestore().collection("withdrawals").limit(200).get().catch(() => ({ docs: [] }));
        wthSnap.docs.forEach((d: any) => {
          firestoreList.push({
            id: d.id,
            withdrawNo: d.id,
            ...d.data()
          });
        });
      }
    } catch (fbErr: any) {}

    const map = new Map<string, any>();
    for (const item of [...firestoreList, ...localList]) {
      const key = String(item.id || item.withdrawNo || item.order_no).replace(/^ProPay-/i, "");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, id: key });
      } else {
        const isApproved = existing.status === "approved" || existing.status === "success" || existing.status === 1 || item.status === "approved" || item.status === "success" || item.status === 1;
        const isRejected = !isApproved && (existing.status === "rejected" || existing.status === "cancelled" || existing.status === 2 || item.status === "rejected" || item.status === "cancelled" || item.status === 2);
        map.set(key, {
          ...existing,
          ...item,
          id: key,
          status: isApproved ? "approved" : (isRejected ? "cancelled" : (item.status || existing.status || "pending"))
        });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return res.json({ withdrawals: merged });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/all-deposits", async (req, res) => {
  try {
    const localList = getLocalTransactions().filter((tx: any) => tx.type === "deposit" || (!tx.type && !tx.withdrawNo) || tx.depositNo || tx.gateway || (tx.order_no && !tx.withdrawNo));
    let firestoreList: any[] = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const depSnap = await adminApp.firestore().collection("deposits").limit(200).get().catch(() => ({ docs: [] }));
        depSnap.docs.forEach((d: any) => {
          firestoreList.push({
            id: d.id,
            order_no: d.id,
            ...d.data()
          });
        });
      }
    } catch (e) {}

    const map = new Map<string, any>();
    for (const item of [...firestoreList, ...localList]) {
      const orderNo = item.order_no || item.id || item.depositNo || item.serialNo || item.doc_id;
      if (!orderNo) continue;
      const key = String(orderNo).replace(/^ProPay-/i, "");
      const existing = map.get(key) || {};
      const cleanTxId = String(item.transactionId || existing.transactionId || key).replace(/^ProPay-/i, "");
      map.set(key, {
        ...existing,
        ...item,
        id: key,
        order_no: key,
        orderId: key,
        depositNo: key,
        serialNo: key,
        transactionId: cleanTxId
      });
    }

    const deposits = Array.from(map.values()).sort((a: any, b: any) => {
      const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
      const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
      return tb - ta;
    });
    return res.json({ success: true, deposits });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to fetch user transactions with resilient fallback across transactions, withdrawals, deposits, history
app.get("/api/user-transactions", async (req, res) => {
  try {
    const uid = String(req.query.uid || "").trim();
    const username = String(req.query.username || "").trim();
    const phone = String(req.query.phone || "").trim();
    if (!uid && !username && !phone) return res.status(400).json({ error: "Missing uid or username" });

    const localList = getLocalTransactions().filter((t: any) => {
      if (uid && t.uid === uid) return true;
      if (username && t.username && t.username.toLowerCase() === username.toLowerCase()) return true;
      if (phone && (t.phone === phone || t.userPhone === phone || t.accountNumber === phone)) return true;
      return false;
    });

    let firestoreList: any[] = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const queries: Promise<any>[] = [];
        if (uid) {
          queries.push(
            db.collection("transactions").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
            db.collection("withdrawals").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
            db.collection("deposits").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
            db.collection("users").doc(uid).collection("history").limit(100).get().catch(() => ({ docs: [] }))
          );
        }
        if (username) {
          queries.push(
            db.collection("transactions").where("username", "==", username).limit(100).get().catch(() => ({ docs: [] })),
            db.collection("deposits").where("username", "==", username).limit(100).get().catch(() => ({ docs: [] }))
          );
        }
        const results = await Promise.all(queries);
        for (const snap of results) {
          if (snap && snap.docs) {
            snap.docs.forEach((d: any) => {
              const data = d.data();
              const isWth = data.type === "withdraw" || !!data.withdrawNo;
              const isDep = !isWth && (data.type === "deposit" || !!data.depositNo || String(d.id).startsWith("ORD") || String(d.id).startsWith("dep"));
              firestoreList.push({
                id: d.id,
                type: isWth ? "withdraw" : (isDep ? "deposit" : (data.type || "deposit")),
                status: data.status || "pending",
                amount: Number(data.amount || 0),
                displayAmount: Number(data.amount || 0),
                method: data.method || (isWth ? (data.bankName || "bank") : "bkash"),
                timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
                createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
                ...data
              });
            });
          }
        }
      }
    } catch (fbErr: any) {
      console.warn("Error reading from firestore collections:", fbErr);
    }

    const map = new Map<string, any>();
    for (const item of [...firestoreList, ...localList]) {
      const key = String(item.id || item.order_no || item.depositNo || item.withdrawNo || (item.timestamp + "_" + item.amount)).replace(/^ProPay-/i, "");
      const cleanTxId = String(item.transactionId || item.order_no || key).replace(/^ProPay-/i, "");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, id: key, transactionId: cleanTxId });
      } else {
        const isApproved = existing.status === "approved" || existing.status === "success" || existing.status === 1 || existing.credited === true ||
                           item.status === "approved" || item.status === "success" || item.status === 1 || item.credited === true;
        const isRejected = !isApproved && (existing.status === "rejected" || existing.status === "cancelled" || existing.status === "failed" || existing.status === 2 ||
                           item.status === "rejected" || item.status === "cancelled" || item.status === "failed" || item.status === 2);
        map.set(key, {
          ...existing,
          ...item,
          id: key,
          transactionId: cleanTxId,
          status: isApproved ? "approved" : (isRejected ? "cancelled" : (item.status || existing.status || "pending")),
          credited: isApproved ? true : (item.credited || existing.credited || false)
        });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return res.json({ transactions: merged });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});



// Update Auth & Firestore Profile Endpoint
app.post("/api/update-auth", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername, newPassword, newPhone } = req.body;
    console.log(`DEBUG: /api/update-auth request body:`, { uid, newUsername, newPassword, newPhone });

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const authUpdate: any = {};
    const firestoreUpdate: any = {};
        if (newPassword) {
      console.log(`DEBUG: New password length: ${newPassword.length}`);
    }

    // Pre-fetch user document from Firestore to get baseline details
    const db = adminApp.firestore();
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    let dbEmail = "";
    let dbUsername = "";
    if (userDoc.exists) {
      const data = userDoc.data() || {};
      dbEmail = data.email || "";
      dbUsername = data.username || "";
    }

    if (newUsername) {
      authUpdate.email = `${newUsername.toLowerCase().replace(/\s+/g, '')}@sn777.com`;
      firestoreUpdate.username = newUsername;
      firestoreUpdate.email = authUpdate.email; // Save the email to Firestore
    }
    if (newPassword) {
      authUpdate.password = newPassword;
      firestoreUpdate.password = newPassword;
    }
    if (newPhone) {
      firestoreUpdate.phone = `+880 ${newPhone}`;
    }

    // 1. Update Auth (for password/user existence)
    if (newPassword) {
      console.log(`DEBUG: Updating Auth password for user ${uid}`);
      let success = false;
      let lastError: any = null;
      for (let i = 0; i < 3; i++) {
        try {
          await adminApp.auth().updateUser(uid, { password: newPassword, disabled: false });
          success = true;
          break;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            console.log(`[update-auth] User not found in Firebase Auth. Re-creating auth record for uid: ${uid}`);
            const targetEmail = dbEmail || authUpdate.email || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, '')}@sn777.com`;
            try {
              await adminApp.auth().createUser({
                uid: uid,
                email: targetEmail,
                password: newPassword,
                disabled: false
              });
              success = true;
              break;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-exists') {
                console.log(`[update-auth] Email ${targetEmail} matches another user during creation. Cleaning up...`);
                try {
                  const conflictingUser = await adminApp.auth().getUserByEmail(targetEmail);
                  if (conflictingUser && conflictingUser.uid !== uid) {
                    await adminApp.auth().deleteUser(conflictingUser.uid);
                    // Retry creation
                    await adminApp.auth().createUser({
                      uid: uid,
                      email: targetEmail,
                      password: newPassword,
                      disabled: false
                    });
                    success = true;
                    break;
                  }
                } catch (cleanErr) {
                  console.error(`[update-auth] Conflicting creation cleanup failed:`, cleanErr);
                }
              }
              console.error(`[update-auth] Re-creation failed:`, createErr);
              lastError = createErr;
            }
          } else {
            lastError = authErr;
          }
          console.error(`DEBUG: Auth password update FAILED (attempt ${i+1}) for user ${uid}:`, authErr);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!success) {
        throw lastError;
      }
      await adminApp.auth().revokeRefreshTokens(uid);
      console.log(`DEBUG: Auth password updated successfully for user ${uid}`);
    }
    
    // Update Auth (other fields like email)
    const otherAuthUpdate: any = { ...authUpdate };
    delete otherAuthUpdate.password;
    if (Object.keys(otherAuthUpdate).length > 0) {
      console.log(`DEBUG: Updating Auth for user ${uid} with data:`, otherAuthUpdate);
      try {
        await adminApp.auth().updateUser(uid, otherAuthUpdate);
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`[update-auth] User not found for other fields update. Re-creating auth record for uid: ${uid}`);
          const targetEmail = otherAuthUpdate.email || dbEmail || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, '')}@sn777.com`;
          const targetPassword = newPassword || (userDoc.exists ? userDoc.data()?.password : undefined) || "123456";
          await adminApp.auth().createUser({
            uid: uid,
            email: targetEmail,
            password: targetPassword,
            disabled: false
          });
        } else if (authErr.code === 'auth/email-already-exists') {
          console.log(`[update-auth] Email ${otherAuthUpdate.email} matches another user during update. Cleaning up conflicting user...`);
          try {
            const conflictingUser = await adminApp.auth().getUserByEmail(otherAuthUpdate.email);
            if (conflictingUser && conflictingUser.uid !== uid) {
              console.log(`[update-auth] Deleting conflicting Auth user with UID: ${conflictingUser.uid}`);
              await adminApp.auth().deleteUser(conflictingUser.uid);
              // Retry update
              await adminApp.auth().updateUser(uid, otherAuthUpdate);
            }
          } catch (cleanErr) {
            console.error(`[update-auth] Conflicting email cleanup during update failed:`, cleanErr);
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }
    }
    
    // 2. Update Firestore (for phone and password string backup)
    if (Object.keys(firestoreUpdate).length > 0 && userDoc.exists) {
      console.log(`DEBUG: Updating Firestore for user ${uid} with data:`, { ...firestoreUpdate, password: '***' });
      await userDocRef.update(firestoreUpdate);
      console.log(`DEBUG: Firestore updated successfully for user ${uid}.`);
    }

    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err: any) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});


// Server-side Telegram Proxy Endpoint for Live Chat
app.post("/api/send-telegram", express.json({limit: "10mb"}), async (req, res) => {
  try {
    const { name, userId, balance, deposit, message } = req.body;
    const SN_BOT_TOKEN = "8877094989:AAGh9VBrp8E4gAJLsU4Ctj0r6-L0DLNOjbI";
    const SN_GROUP_ID = "-1003806717205";

    const payloadText = 
      "📩 New Live Message\n" +
      "🌐 Site: Sn777.site\n" +
      "👤 Name: " + (name || "User") + "\n" +
      "🆔 User ID: " + (userId || "Guest") + "\n" +
      "💰 Balance: " + (balance || "৳0.00") + "\n" +
      "💳 Total Deposit: " + (deposit || "৳0.00") + "\n" +
      "----------------------------------\n" +
      "💬 Message: " + (message || "").trim();

    const tgUrl = `https://api.telegram.org/bot${SN_BOT_TOKEN}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: SN_GROUP_ID,
        text: payloadText
      })
    });

    const data = await response.json();
    if (data.ok) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: data.description || "Telegram API error" });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// Lookup User Endpoint for Live Chat and Verification
app.get("/api/lookup-user", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return res.status(503).json({ error: "Database not available" });
    const rawQuery = String(req.query.q || req.query.username || req.query.uid || req.query.phone || "").trim();
    if (!rawQuery) return res.status(400).json({ error: "Missing query" });

    const db = adminApp.firestore();
    const auth = adminApp.auth();
    let userData: any = null;
    let userUid: string = "";

    // 1. Try direct doc(uid) in Firestore
    try {
      const docSnap = await db.collection("users").doc(rawQuery).get();
      if (docSnap.exists) {
        userData = docSnap.data();
        userUid = docSnap.id;
      }
    } catch (e) {}

    // 2. Try by Auth Email / getUserByEmail
    if (!userData) {
      const candidateEmails = [
        rawQuery.includes("@") ? rawQuery : `${rawQuery.toLowerCase().replace(/\s+/g, '')}@sn777.com`,
        `m${rawQuery.toLowerCase().replace(/\s+/g, '')}@sn777.com`,
        `md${rawQuery.toLowerCase().replace(/\s+/g, '')}@sn777.com`,
        `${rawQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}@sn777.com`
      ];

      for (const email of candidateEmails) {
        try {
          const authUser = await auth.getUserByEmail(email);
          if (authUser) {
            userUid = authUser.uid;
            try {
              const docSnap = await db.collection("users").doc(authUser.uid).get();
              if (docSnap.exists) {
                userData = docSnap.data();
              }
            } catch (errDoc) {}
            if (!userData) {
              userData = {
                username: authUser.email ? authUser.email.split("@")[0] : rawQuery,
                email: authUser.email,
                name: authUser.displayName || rawQuery,
                phone: authUser.phoneNumber || "",
                balance: "0.00",
                totalDeposited: 0
              };
            }
            break;
          }
        } catch (e) {}
      }
    }

    // 3. Try by username in Firestore where query
    if (!userData) {
      try {
        const snap = await db.collection("users").where("username", "==", rawQuery).limit(1).get();
        if (!snap.empty) {
          userData = snap.docs[0].data();
          userUid = snap.docs[0].id;
        }
      } catch (e) {}
    }

    // 4. Try by username lowercase/trimmed in Firestore
    if (!userData) {
      try {
        const snap = await db.collection("users").where("username", "==", rawQuery.toLowerCase()).limit(1).get();
        if (!snap.empty) {
          userData = snap.docs[0].data();
          userUid = snap.docs[0].id;
        }
      } catch (e) {}
    }

    // 5. Try Auth listUsers fuzzy search if still not found
    if (!userData) {
      try {
        const list = await auth.listUsers(1000);
        const cleanQ = rawQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = list.users.find(u => {
          const email = (u.email || '').toLowerCase();
          const cleanEmail = email.split('@')[0];
          return cleanEmail === cleanQ || cleanEmail.includes(cleanQ) || cleanQ.includes(cleanEmail);
        });
        if (matched) {
          userUid = matched.uid;
          try {
            const docSnap = await db.collection("users").doc(matched.uid).get();
            if (docSnap.exists) {
              userData = docSnap.data();
            }
          } catch (e) {}
          if (!userData) {
            userData = {
              username: matched.email ? matched.email.split("@")[0] : rawQuery,
              email: matched.email,
              name: matched.displayName || matched.email?.split("@")[0] || rawQuery,
              balance: "0.00",
              totalDeposited: 0
            };
          }
        }
      } catch (e) {}
    }

    if (!userData) {
      return res.json({ success: false, error: "User not found" });
    }

    const numBal = parseFloat(String(userData.balance || "0").replace(/,/g, "")) || 0;
    const numDep = parseFloat(String(userData.totalDeposited || "0").replace(/,/g, "")) || 0;

    return res.json({
      success: true,
      user: {
        uid: userUid,
        username: userData.username || rawQuery,
        name: userData.name || userData.username || rawQuery,
        phone: userData.phone || "",
        email: userData.email || "",
        balance: "৳" + numBal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawBalance: numBal,
        deposit: "৳" + numDep.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawDeposit: numDep,
        role: userData.role || "user"
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/debug-users", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const username = req.query.username as string;
    
    let authUser = null;
    try {
       if (username) {
         authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, '')}@sn777.com`);
       } else {
         return res.json({error: "provide username"});
       }
    } catch(e: any) {
       authUser = { error: e.message };
    }
    
    // Check Firestore
    const snapshot = await adminApp.firestore().collection("users").where("username", "==", username).get();
    let firestoreData = null;
    if (!snapshot.empty) {
        firestoreData = snapshot.docs[0].data();
    }
    
    res.json({
      auth_user: authUser,
      firestore_data: firestoreData
    });
  } catch (e: any) {
    res.json({error: e.message});
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/debug-project", (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    res.json({ projectId: adminApp.app().options.projectId });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});


// Live chat route - redirects to Telegram support
app.get("/chat", (req, res) => {
  res.redirect("https://t.me/sn777top");
});

// Simple keep-alive log every 15 minutes
setInterval(() => {
  console.log(`${new Date().toISOString()} - System Keep-Alive: OK`);
}, 15 * 60 * 1000);


// Verify Payment Endpoint
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { order_no } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no", success: false, status: "failed" });
    }
    const cleanOrderNo = String(order_no).trim();
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch(e) {}

    let depositData: any = null;
    const localList = getLocalTransactions();
    const localItem = localList.find((x: any) => (x.order_no === cleanOrderNo || x.id === cleanOrderNo || x.depositNo === cleanOrderNo));
    if (localItem) {
      depositData = { ...localItem };
    }

    if (db) {
      try {
        // 1. Direct get
        let dSnap = await db.collection("deposits").doc(cleanOrderNo).get();
        if (dSnap.exists) {
          depositData = { ...depositData, ...dSnap.data() };
        } else {
          // 2. Query by order_no field
          let qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get();
          if (!qSnap.empty) {
            depositData = { ...depositData, ...qSnap.docs[0].data() };
          }
        }
      } catch (dbErr) {
        console.warn("[verify-payment] Firestore read warning:", dbErr);
      }
    }

    if (!depositData) {
      return res.json({
        success: false,
        status: "failed",
        error: "ভুল ট্রানজ্যাকশন আইডি! কোনো রেকর্ড পাওয়া যায়নি।",
        amount: 0,
        finalCredit: 0
      });
    }

    const isApproved = depositData.status === "approved" || depositData.status === "success" || depositData.credited === true;
    const isPending = depositData.status === "pending" || depositData.status === "processing";
    const isFailed = depositData.status === "failed" || depositData.status === "cancelled";

    const currentStatus = isApproved ? "approved" : (isPending ? "pending" : "failed");

    res.json({
      success: isApproved,
      status: currentStatus,
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || depositData?.amount || 0,
      message: isApproved ? "পেমেন্ট সফলভাবে ভেরিফাই ও ক্রেডিট করা হয়েছে।" : (isPending ? "পেমেন্ট প্রক্রিয়াধীন রয়েছে..." : "পেমেন্ট ব্যর্থ বা বাতিল হয়েছে।")
    });
  } catch (err: any) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message, success: false, status: "failed" });
  }
});

// Auto Check User Deposits Endpoint
// Validate Manual / Direct TrxID Endpoint
app.post("/api/validate-manual-deposit", async (req, res) => {
  try {
    const { uid, transactionId, order_no, amount } = req.body;
    const cleanTxId = String(transactionId || order_no || "").trim();
    if (!cleanTxId) {
      return res.status(400).json({ success: false, error: "ট্রানজ্যাকশন আইডি প্রদান করুন।" });
    }

    // 1. Fake / Bad Format Check (Minimum 8 chars, alphanumeric, no repetitive chars)
    if (cleanTxId.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(cleanTxId) || /^(.)\1+$/.test(cleanTxId)) {
      return res.status(400).json({
        success: false,
        error: "ভুল বা ফেক ট্রানজ্যাকশন আইডি! ফরম্যাট সঠিক নয় (কমপক্ষে ৮ অক্ষরের সঠিক ট্রানজ্যাকশন আইডি দিন)।"
      });
    }

    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    // 2. Strict 1-Time Usage / Duplicate Check across Database
    if (db) {
      try {
        const querySnap = await db.collection("deposits")
          .where("transactionId", "==", cleanTxId)
          .limit(10)
          .get();

        for (const doc of querySnap.docs) {
          if (doc.id !== order_no) {
            const d = doc.data();
            if (d.status === "approved" || d.status === "success" || d.credited === true) {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে! একই আইডি বারবার ব্যবহার করা সম্ভব নয়।"
              });
            } else if (d.status === "pending") {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডি দিয়ে ইতিমধ্যে একটি ডিপোজিট রিকোয়েস্ট অপেক্ষমান রয়েছে।"
              });
            }
          }
        }

        const queryOrderSnap = await db.collection("deposits")
          .where("order_no", "==", cleanTxId)
          .limit(10)
          .get();

        for (const doc of queryOrderSnap.docs) {
          if (doc.id !== order_no) {
            const d = doc.data();
            if (d.status === "approved" || d.status === "success" || d.credited === true) {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে!"
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr);
      }
    }

    // Check local transaction store for duplicates
    const localList = getLocalTransactions();
    const isDupApproved = localList.some((x: any) => 
      x.id !== order_no && x.order_no !== order_no &&
      (x.transactionId === cleanTxId || x.order_no === cleanTxId || x.id === cleanTxId) &&
      (x.status === "approved" || x.credited === true)
    );

    if (isDupApproved) {
      return res.status(400).json({
        success: false,
        error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে!"
      });
    }

    return res.json({ success: true, message: "ট্রানজ্যাকশন আইডি বৈধ এবং গ্রহণ করা হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Approve Deposit Endpoint (Strict 1-Time Credit Lock)
// Admin Approve Deposit Endpoint (Dual-layer resilience)
app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, uid: reqUid, username: reqUsername, amount, finalCredit: reqFinalCredit } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no or doc_id" });
    }

    const requestedAmount = Number(amount) || 0;
    const finalCredit = Number(reqFinalCredit || requestedAmount || 0);

    let uid = reqUid || "";
    let userUpdated = false;

    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const db = adminApp.firestore();
      try {
        // 1. Try finding deposit doc
        let depDoc = await db.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
        let depData = depDoc && depDoc.exists ? depDoc.data() : null;

        if (!depData && doc_id && doc_id !== cleanOrderNo) {
          depDoc = await db.collection("deposits").doc(String(doc_id)).get().catch(() => null);
          if (depDoc && depDoc.exists) depData = depDoc.data();
        }

        if (!depData) {
          const qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get().catch(() => ({ empty: true, docs: [] }));
          if (!qSnap.empty) {
            depDoc = qSnap.docs[0];
            depData = depDoc.data();
          }
        }

        if (depData) {
          if (depData.status === "approved" || depData.credited === true) {
             return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে! একই ট্রানজ্যাকশন দুইবার অ্যাপ্রুভ করা সম্ভব নয়।" });
          }
          if (depData.status === "rejected" || depData.cancelled === true) {
             return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি বাতিল (রিজেক্ট) করা হয়েছে। রিজেক্ট হওয়া ট্রানজ্যাকশন অ্যাপ্রুভ করা সম্ভব নয়।" });
          }
          if (!uid) uid = depData.uid;
        }

        // Also check if any other deposit has the same transactionId and is already approved
        let trxIdToCheck = depData?.transactionId || req.body?.transactionId || "";
        trxIdToCheck = String(trxIdToCheck).trim();
        if (trxIdToCheck && trxIdToCheck !== cleanOrderNo && !trxIdToCheck.startsWith("ORD")) {
           const dupSnap = await db.collection("deposits").where("transactionId", "==", trxIdToCheck).where("status", "==", "approved").limit(1).get().catch(() => ({ empty: true, docs: [] }));
           if (!dupSnap.empty) {
              return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশন আইডিটি (" + trxIdToCheck + ") অন্য একটি ডিপোজিটে ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে! একই আইডি বারবার ব্যবহার করা অবৈধ।" });
           }
        }

        // If UID still not found, try username lookup
        if (!uid && (reqUsername || depData?.username)) {
          const uName = reqUsername || depData?.username;
          const uSnap = await db.collection("users").where("username", "==", uName).limit(1).get().catch(() => ({ empty: true, docs: [] }));
          if (!uSnap.empty) {
            uid = uSnap.docs[0].id;
          }
        }

        // Update user balance in Firestore if uid exists
        if (uid) {
          try {
            const userRef = db.collection("users").doc(uid);
            const userSnap = await userRef.get();
            const userData = userSnap.exists ? userSnap.data() : {};
            const curBal = parseFloat(String(userData?.balance || "0").replace(/,/g, "")) || 0;
            const curDep = parseFloat(String(userData?.totalDeposited || "0").replace(/,/g, "")) || 0;
            const curCount = Number(userData?.approvedDepositsCount || 0);
            
            const newBal = (curBal + (finalCredit || requestedAmount)).toFixed(2);
            const newTotalDep = curDep + requestedAmount;
            const newCount = curCount + 1;

            await userRef.set({
              balance: newBal,
              approvedDepositsCount: newCount,
              totalDeposited: newTotalDep,
              withdrawEnabled: (newTotalDep >= 940 && newCount >= 2),
              updatedAt: new Date().toISOString()
            }, { merge: true });
            userUpdated = true;
          } catch (userErr) {
            console.warn("[approve-deposit] User balance update warning:", userErr);
          }
        }

        // Mark deposit doc approved
        const approvedPayload = {
          status: "approved",
          credited: true,
          amount: requestedAmount,
          finalCredit: finalCredit || requestedAmount,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (depDoc && depDoc.ref) {
          await depDoc.ref.set(approvedPayload, { merge: true }).catch(() => {});
        } else {
          await db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        }
        await db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        if (uid) {
          await db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn("[approve-deposit] Firestore warning (fallback active):", dbErr);
      }
    }

    // Save to local transactions store fallback
    
    saveLocalTransaction({
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid: uid || reqUid || "",
      status: "approved",
      credited: true,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount,
      type: "deposit",
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `ডিপোজিট অ্যাপ্রুভ হয়েছে এবং ইউজারের ব্যালেন্সে ৳${finalCredit || requestedAmount} যোগ করা হয়েছে।`,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount
    });
  } catch (err: any) {
    console.error("[APPROVE DEPOSIT ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message || "ডিপোজিট অ্যাপ্রুভ করতে ব্যর্থ হয়েছে।" });
  }
});

app.post("/api/admin/reject-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, reason } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no" });
    }

    let uid = "";
    
      const adminApp = getFirebaseAdmin();
    if (adminApp) {
      try {
        const db = adminApp.firestore();
        let depDoc = await db.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
        let depData = depDoc && depDoc.exists ? depDoc.data() : null;
        if (!depData && doc_id && doc_id !== cleanOrderNo) {
          depDoc = await db.collection("deposits").doc(String(doc_id)).get().catch(() => null);
          if (depDoc && depDoc.exists) depData = depDoc.data();
        }
        if (!depData) {
          const qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get().catch(() => ({ empty: true, docs: [] }));
          if (!qSnap.empty) {
            depDoc = qSnap.docs[0];
            depData = depDoc.data();
          }
        }
        if (depData) {
          uid = depData.uid;
          if (depData.status === "approved" || depData.credited === true) {
            return res.status(400).json({ success: false, error: "ইতিমধ্যে অ্যাপ্রুভড হওয়া ডিপোজিট বাতিল করা সম্ভব নয়!" });
          }
        }
        const rejectPayload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
          updatedAt: new Date().toISOString(),
          ...(uid && { uid }),
          
          ...(doc_id && { doc_id })
        };
        if (depDoc && depDoc.ref) {
          await depDoc.ref.set(rejectPayload, { merge: true }).catch(() => {});
        } else {
          await db.collection("deposits").doc(cleanOrderNo).set(rejectPayload, { merge: true }).catch(() => {});
        }
        await db.collection("transactions").doc(cleanOrderNo).set(rejectPayload, { merge: true }).catch(() => {});
        if (uid) {
          await db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(rejectPayload, { merge: true }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn("[reject-deposit] Firestore warning:", dbErr);
      }
    }

    
    saveLocalTransaction({
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      status: "rejected",
      cancelled: true,
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, message: "ডিপোজিট রিজেক্ট/বাতিল করা হয়েছে।" });
  } catch (err: any) {
    console.error("[REJECT DEPOSIT ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/approve-withdrawal", async (req, res) => {
  try {
    const { id, doc_id, withdrawNo, uid } = req.body;
    const cleanId = String(id || doc_id || withdrawNo || "").trim();
    if (!cleanId) return res.status(400).json({ success: false, error: "Missing withdrawal id" });

    
      const adminApp = getFirebaseAdmin();
    if (adminApp) {
      try {
        const db = adminApp.firestore();
        const payload = {
          status: "approved",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "উইথড্র সফলভাবে সম্পন্ন হয়েছে (সাকসেসফুল)"
        };
        await db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        await db.collection("transactions").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        if (uid) {
          await db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        }
      } catch (e) {}
    }
    
    saveLocalTransaction({
      id: cleanId,
      withdrawNo: cleanId,
      status: "approved",
      type: "withdraw",
      updatedAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "উইথড্র অ্যাপ্রুভ হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/reject-withdrawal", async (req, res) => {
  try {
    const { id, doc_id, withdrawNo, uid, amount, reason } = req.body;
    const cleanId = String(id || doc_id || withdrawNo || "").trim();
    if (!cleanId) return res.status(400).json({ success: false, error: "Missing withdrawal id" });
    const refundAmount = Number(amount) || 0;

    
      const adminApp = getFirebaseAdmin();
    if (adminApp) {
      try {
        const db = adminApp.firestore();
        if (uid && refundAmount > 0) {
          const userRef = db.collection("users").doc(uid);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
            const newBal = (curBal + refundAmount).toFixed(2);
            await userRef.set({ balance: newBal, updatedAt: new Date().toISOString() }, { merge: true });
          }
        }
        const payload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "উইথড্র রিকোয়েস্ট বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।"
        };
        await db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        await db.collection("transactions").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        if (uid) {
          await db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true }).catch(() => {});
        }
      } catch (e) {}
    }
    
    saveLocalTransaction({
      id: cleanId,
      withdrawNo: cleanId,
      status: "rejected",
      cancelled: true,
      type: "withdraw",
      updatedAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auto-check-user-deposits", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    const results: any[] = [];
    let userDocData: any = null;

    if (db) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {}

      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();
        for (const doc of depSnap.docs) {
          const parsed = doc.data();
          const order_no = doc.id;
          const isApproved = parsed.status === "approved" || parsed.status === "success";
          const isUnnotified = parsed.notified === false || (parsed.notified !== true && parsed.notified !== "true");
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
      } catch (err: any) {}
    }
    return res.json({ success: true, results, user: userDocData });
  } catch (e: any) {
    return res.json({ success: true, results: [], user: null });
  }
});




// --- ProPay Payment Gateway Integration (v1.1) ---

const PROPAY_API_KEY = process.env.PROPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc";

let lastOrderIdTime = 0;
function generateCleanOrderId(customOrderNo?: string): string {
  if (customOrderNo && /^ORD\d+$/.test(customOrderNo.trim())) {
    return customOrderNo.trim();
  }
  let now = Date.now();
  if (now <= lastOrderIdTime) {
    now = lastOrderIdTime + 1;
  }
  lastOrderIdTime = now;
  return `ORD${now}`;
}

// Initiate ProPay Payment
app.all(["/propay_pay.php", "/api/propay-pay", "/api/create-payment"], async (req, res) => {
  try {
    const uid = String(req.query.uid || req.body?.uid || "").trim();
    const rawAmount = req.query.amount || req.body?.amount || 200;
    const amount = parseFloat(String(rawAmount)) || 150;
    const method = String(req.query.method || req.body?.method || "bkash").trim().toLowerCase();
    
    // Clean order_no format: ORD<timestamp> (e.g. ORD1788280782736)
    const customOrderNo = String(req.query.order_no || req.body?.order_no || "").trim();
    const order_no = generateCleanOrderId(customOrderNo);

    if (!uid) {
      return res.status(400).json({ error: "Missing uid", success: false });
    }

    let username = String(req.query.username || req.body?.username || "").trim();
    let phone = String(req.query.phone || req.body?.phone || req.query.userPhone || req.body?.userPhone || "").trim();

    // Optionally enrich user profile data for Admin Panel visibility
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      try {
        const uSnap = await adminApp.firestore().collection("users").doc(uid).get().catch(() => null);
        if (uSnap && uSnap.exists) {
          const uData = uSnap.data() || {};
          if (!username) username = uData.username || uData.name || uData.displayName || uid;
          if (!phone) phone = uData.phone || uData.phoneNumber || uData.accountNumber || "";
        }
      } catch (e) {}
    }

    const host = req.get("host") || "www.sn777.site";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const origin = `${protocol}://${host}`;

    const gateway_url = (method === "nagad")
      ? "https://checkout.propay.cyou/pay/Nagad.php"
      : "https://checkout.propay.cyou/pay/Bkash.php";

    const isRunAppOrLocal = host.includes("run.app") || host.includes("localhost") || host.includes("127.0.0.1");
    const backendHost = "https://sn777.site";
    const returnUrl = `${origin}/success.php?order_no=${encodeURIComponent(order_no)}`;
    const callbackUrl = `${backendHost}/callback.php`;

    const params = new URLSearchParams({
      api_key: PROPAY_API_KEY,
      uid: uid,
      amount: amount.toFixed(2),
      order_no: order_no,
      return_url: returnUrl,
      pass_through_key: PROPAY_API_KEY,
      pass_through_callback_url: callbackUrl
    });

    const redirectUrl = `${gateway_url}?${params.toString()}`;

    // Record pending transaction locally & in Firestore with all order ID aliases for Admin Panel
    const nowIso = new Date().toISOString();
    const pendingTx = {
      id: order_no,
      order_no: order_no,
      orderId: order_no,
      depositNo: order_no,
      serialNo: order_no,
      doc_id: order_no,
      transactionId: order_no,
      uid: uid,
      username: username || uid,
      phone: phone,
      userPhone: phone,
      accountNumber: phone,
      type: "deposit",
      amount: amount,
      finalCredit: amount,
      method: method,
      status: "pending",
      gateway: "propay",
      timestamp: nowIso,
      createdAt: nowIso,
      description: `ProPay ${method.toUpperCase()} Deposit (${order_no})`
    };

    
    saveLocalTransaction(pendingTx);

    if (adminApp) {
      try {
        const db = adminApp.firestore();
        await db.collection("deposits").doc(order_no).set(pendingTx, { merge: true }).catch(() => {});
        await db.collection("transactions").doc(order_no).set(pendingTx, { merge: true }).catch(() => {});
      } catch (dbErr) {}
    }

    // Return JSON if requested as API, or redirect if form submission / browser GET
    if (req.headers.accept && req.headers.accept.includes("application/json") && req.method === "POST" && !req.query.redirect) {
      return res.json({ success: true, redirect_url: redirectUrl, order_no });
    }

    return res.redirect(redirectUrl);
  } catch (err: any) {
    console.error("[ProPay Pay Error]:", err);
    return res.status(500).json({ error: err.message, success: false });
  }
});

// ProPay Webhook Callback Notification (callback.php)
app.all(["/callback.php", "/api/propay-callback"], async (req, res) => {
  try {
    const received_signature = String(req.body?.signature || req.query?.signature || "").trim();
    const order_no = String(req.body?.order_no || req.query?.order_no || "").trim();
    const raw_amount = req.body?.amount || req.query?.amount || "";
    const amountStr = String(raw_amount).trim();
    const status = String(req.body?.status || req.query?.status || "").trim().toLowerCase();

    console.log(`[ProPay Callback] Received: order_no=${order_no}, amount=${amountStr}, status=${status}, signature=${received_signature}`);

    if (!received_signature || !order_no || !amountStr) {
      console.warn("[ProPay Callback] Missing parameters");
      return res.status(400).send("Missing parameters");
    }

    if (status && status !== "success") {
      console.warn(`[ProPay Callback] Status is not success (${status}) for order: ${order_no}`);
      return res.status(200).send("Ignored non-success status");
    }

    // Security Verification: expected_signature = hash_hmac('sha256', order_no + formatted_amount, api_key)
    const float_amount = parseFloat(amountStr);
    const formatted_amount_str = float_amount.toString();
    const clean_order_no = order_no.replace(/^ProPay-/i, "");

    const candidates = [
      order_no + formatted_amount_str,
      order_no + amountStr,
      order_no + float_amount.toFixed(2),
      clean_order_no + formatted_amount_str,
      clean_order_no + amountStr,
      clean_order_no + float_amount.toFixed(2)
    ];

    const isMatch = candidates.some((cand) => {
      const sig = crypto.createHmac("sha256", PROPAY_API_KEY).update(cand).digest("hex");
      return sig.toLowerCase() === received_signature.toLowerCase();
    });

    if (!isMatch) {
      console.warn("[ProPay Callback] Invalid signature verification failed for order:", order_no);
      return res.status(403).send("Invalid Signature");
    }

    // Check if order was already approved & credited to prevent double-crediting
    const localList = getLocalTransactions();
    const existingLocalTx = localList.find((item: any) => item.id === order_no || item.order_no === order_no);
    if (existingLocalTx && existingLocalTx.status === "approved" && existingLocalTx.credited) {
      console.log(`[ProPay Callback] Order ${order_no} already approved and credited. Idempotent return.`);
      return res.status(200).send("Success");
    }

    // Payment Signature Verified!
    const paidAmount = parseFloat(amountStr) || 0;
    const finalCredit = paidAmount;

    // 1. Update Local Transactions Store
    saveLocalTransaction({
      id: order_no,
      order_no: order_no,
      orderId: order_no,
      depositNo: order_no,
      serialNo: order_no,
      status: "approved",
      credited: true,
      amount: paidAmount,
      finalCredit: finalCredit,
      gateway: "propay",
      updatedAt: new Date().toISOString()
    });

    // 2. Sync to Firestore & Update User Balance
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      try {
        const db = adminApp.firestore();
        let uid = existingLocalTx?.uid || "";

        // Find deposit document to get user ID if not found locally
        const depDocRef = db.collection("deposits").doc(order_no);
        const depSnap = await depDocRef.get().catch(() => null);
        if (depSnap && depSnap.exists) {
          const depData = depSnap.data() || {};
          if (depData.credited === true) {
            console.log(`[ProPay Callback] Order ${order_no} already credited in Firestore. Idempotent return.`);
            return res.status(200).send("Success");
          }
          if (!uid) {
            uid = depData.uid || "";
          }
        }

        if (!uid) {
          const txSnap = await db.collection("transactions").doc(order_no).get().catch(() => null);
          if (txSnap && txSnap.exists) {
            uid = txSnap.data()?.uid || "";
          }
        }

        const approvedPayload = {
          id: order_no,
          order_no: order_no,
          orderId: order_no,
          depositNo: order_no,
          serialNo: order_no,
          status: "approved",
          credited: true,
          amount: paidAmount,
          finalCredit: finalCredit,
          gateway: "propay",
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await depDocRef.set(approvedPayload, { merge: true }).catch(() => {});
        await db.collection("transactions").doc(order_no).set(approvedPayload, { merge: true }).catch(() => {});

        if (uid) {
          const userRef = db.collection("users").doc(uid);
          const userSnap = await userRef.get().catch(() => null);
          if (userSnap && userSnap.exists) {
            const uData = userSnap.data() || {};
            const curBal = parseFloat(String(uData.balance || "0").replace(/,/g, "")) || 0;
            const curDep = parseFloat(String(uData.totalDeposited || "0").replace(/,/g, "")) || 0;
            const curCount = Number(uData.approvedDepositsCount || 0);

            const newBal = (curBal + finalCredit).toFixed(2);
            const newTotalDep = curDep + paidAmount;
            const newCount = curCount + 1;

            await userRef.set({
              balance: newBal,
              approvedDepositsCount: newCount,
              totalDeposited: newTotalDep,
              withdrawEnabled: (newTotalDep >= 940 && newCount >= 2),
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }

          await db.collection("users").doc(uid).collection("history").doc(order_no).set(approvedPayload, { merge: true }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn("[ProPay Callback] Firestore update warning:", dbErr);
      }
    }

    console.log(`[ProPay Callback] Deposit ${order_no} successfully verified and approved!`);
    return res.status(200).send("Success");
  } catch (err: any) {
    console.error("[ProPay Callback Error]:", err);
    return res.status(500).send("Internal Server Error");
  }
});

// ProPay Payment Return / Success Page (success.php)
app.all(["/success.php", "/success"], (req, res) => {
  const order_no = req.query.order_no || req.body?.order_no || "";
  return res.redirect(`/?m=1&order_no=${encodeURIComponent(String(order_no))}`);
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const distBackupPath = path.join(process.cwd(), 'dist_backup');

  // Ensure dist directory has all assets
  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
    try {
      fs.mkdirSync(distPath, { recursive: true });
      if (fs.existsSync(distBackupPath)) {
        fs.cpSync(distBackupPath, distPath, { recursive: true });
      }
    } catch (e) {}
  }

  app.use(express.static(distPath));
  if (fs.existsSync(distBackupPath)) {
    app.use(express.static(distBackupPath));
  }

  // Fallback route for static assets
  app.get('/assets/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    const fileInDist = path.join(distPath, 'assets', filename);
    const fileInBackup = path.join(distBackupPath, 'assets', filename);

    if (fs.existsSync(fileInDist)) {
      return res.sendFile(fileInDist);
    }
    if (fs.existsSync(fileInBackup)) {
      return res.sendFile(fileInBackup);
    }

    // Proxy fallback to sn777.site if asset isn't local
    try {
      const remoteRes = await fetch(`https://sn777.site/assets/${filename}`);
      if (remoteRes.ok) {
        const buf = Buffer.from(await remoteRes.arrayBuffer());
        try {
          fs.mkdirSync(path.join(distPath, 'assets'), { recursive: true });
          fs.writeFileSync(fileInDist, buf);
        } catch (e) {}
        res.setHeader('Content-Type', remoteRes.headers.get('content-type') || 'application/javascript');
        return res.send(buf);
      }
    } catch (e) {}
    
    next();
  });

  // SPA fallback
  app.get('*', (req, res) => {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
      ? path.join(distPath, 'index.html')
      : path.join(distBackupPath, 'index.html');
    res.sendFile(indexPath);
  });

  // Auto-cancel deposits older than 7 minutes (Runs every 3 minutes to optimize quota)
  cron.schedule('*/3 * * * *', async () => {
    console.log('[Cron] Running auto-cancel check for pending deposits');
    const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();

    // 1. Process local storage transactions auto-cancel
    try {
      const localList = getLocalTransactions();
      let modified = false;
      for (const tx of localList) {
        if (tx.type === "deposit" && tx.status === "pending") {
          const tIso = tx.timestamp || tx.createdAt || "";
          if (tIso && tIso < sevenMinutesAgo) {
            tx.status = "cancelled";
            tx.updatedAt = new Date().toISOString();
            modified = true;
          }
        }
      }
      if (modified) {
        fs.writeFileSync(TX_STORE_FILE, JSON.stringify(localList, null, 2), "utf8");
      }
    } catch (localErr) {}

    // 2. Try Firestore auto-cancel with graceful handling for Quota Exceeded / Code 8
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    
    try {
        const db = adminApp.firestore();
        const pendingDeposits = await db.collection('deposits')
            .where('status', '==', 'pending')
            .get();
        
        for (const doc of pendingDeposits.docs) {
            const data = doc.data();
            let createdDate = data.timestamp;
            if (createdDate && typeof createdDate.toDate === 'function') {
                createdDate = createdDate.toDate().toISOString();
            } else if (createdDate && typeof createdDate === 'string') {
                // Already string, nothing to do
            } else {
                continue;
            }
            
            if (createdDate && createdDate < sevenMinutesAgo) {
                const depositId = doc.id;
                const uid = data.uid;

                // 1. Update deposits document
                await doc.ref.update({ status: 'cancelled' }).catch(() => {});

                // 2. Update transactions document
                try {
                    await db.collection('transactions').doc(depositId).update({ status: 'cancelled' }).catch(() => {});
                } catch (txErr: any) {}

                // 3. Update users/{uid}/history/{depositId} document if uid exists
                if (uid) {
                    try {
                        await db.collection('users').doc(uid).collection('history').doc(depositId).update({ status: 'cancelled' }).catch(() => {});
                    } catch (histErr: any) {}
                }
            }
        }
    } catch (error: any) {
        if (error?.code === 8 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded")) {
            console.warn('[Cron] Firestore quota exceeded during auto-cancel check, local transactions auto-cancelled gracefully.');
        } else {
            console.error('[Cron] Error running auto-cancel check:', error?.message || error);
        }
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

}

startServer();
