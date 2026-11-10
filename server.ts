
function getDepositFinalCredit(paidAmount: number, rawBonusOption?: string, reqFinalCredit?: number): { finalCredit: number, bonusAmount: number } {
  const deposit = Math.max(0, Math.round(Number(paidAmount) || 0));
  if (deposit <= 0) return { finalCredit: 0, bonusAmount: 0 };

  if (reqFinalCredit && reqFinalCredit > deposit) {
    return { finalCredit: reqFinalCredit, bonusAmount: reqFinalCredit - deposit };
  }

  let bonusPercent = 0;
  if (rawBonusOption) {
    const opt = String(rawBonusOption).toLowerCase();
    if (opt.includes("100") || opt.includes("welcome") || opt.includes("double")) bonusPercent = 100;
    else if (opt.includes("50") || opt.includes("sports")) bonusPercent = 50;
    else if (opt.includes("20") || opt.includes("regular")) bonusPercent = 20;
    else if (opt.includes("10") || opt.includes("cashback")) bonusPercent = 10;
  }

  // Only apply bonus if bonus option is explicitly selected or requested
  const bonusAmount = Math.round(deposit * (bonusPercent / 100));
  const finalCredit = deposit + bonusAmount;
  return { finalCredit, bonusAmount };
}


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

import fs from "fs";
import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
const appDir = process.cwd();
import crypto from "crypto";

import { initializeApp as initAdminApp, getApps as getAdminApps, cert as adminCert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

import {
  parseSms,
  getSmsSettings,
  saveSmsSettings,
  getSmsLogs,
  saveSmsLog,
  getVerifiedSmsPool,
  addToVerifiedPool,
  findMatchingSmsInPool,
  claimPoolSms,
  type ParsedSms,
  type SmsLog,
  type VerifiedSmsPoolItem,
  type SmsSettings
} from "./sms_verifier.ts";
import {
  GOPAY_APP_ID,
  GOPAY_SECRET_KEY,
  GOPAY_API_URL,
  generateCleanOrderId,
  formatGoPayOrderDate,
  generateGoPaySign,
  calculateGoPaySignDetails,
  buildGoPayPayload,
  sendGoPayCaptureRequest
} from "./gopay_gateway.ts";
// Process safety
process.on("uncaughtException", (err) => {
  console.error("[Server Process Uncaught Exception]:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Server Process Unhandled Rejection]:", reason);
});

// Create server
const app = express();
app.use(compression({
  threshold: 1024,
  level: 6,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  }
}));
const argv = process.argv.slice(2);
function getCmdArg(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 ? argv[idx + 1] : undefined;
}
const PORT = parseInt(process.env.PORT || getCmdArg("--port") || "3000", 10);
const HOST = process.env.HOST || getCmdArg("--host") || "0.0.0.0";

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


app.use((req, res, next) => {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
  if (host.includes("sn777.top")) {
    return res.redirect(301, `https://sn777.site${req.originalUrl || req.url || ""}`);
  }
  next();
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: ["text/*", "application/*"], limit: "50mb" }));
app.use((err: any, _req: any, res: any, next: any) => {
  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    return res.status(413).json({ success: false, error: "Payload too large. Please upload a smaller file." });
  }
  next(err);
});
app.use((req, _res, next) => {
  if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

// Circuit breaker for Firestore quota exhaustion to prevent hanging requests
let firestoreQuotaExceededUntil = 0;

async function getFirestoreDepositsSafe(adminApp: any) {
  try {
    const db = getFirestoreDb();
    const queries = [
      adminApp.firestore().collection("deposits").orderBy("timestamp", "desc").limit(150).get().catch(() => ({ docs: [] })),
      db ? db.collection("deposits").orderBy("timestamp", "desc").limit(150).get().catch(() => ({ docs: [] })) : Promise.resolve({ docs: [] })
    ];
    const results = await Promise.all(queries);
    const map = new Map<string, any>();
    results.forEach((snap: any) => {
      if (snap && snap.docs) {
        snap.docs.forEach((d: any) => {
          map.set(d.id, { id: d.id, order_no: d.id, ...d.data() });
        });
      }
    });
    
    if (map.size > 0) {
      return Array.from(map.values());
    }

    // Fallback: Attempt REST API access
    try {
      const dbIds = ["(default)", FS_DB_ID];
      const projectId = FS_PROJECT_ID;
      const allDocs: any[] = [];
      
      for (const dbId of dbIds) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/deposits?pageSize=100`;
        const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + (await adminApp.credential.getAccessToken()).token } }).catch(() => null);
        if (response && response.ok) {
          const data = await response.json();
          const docs = data.documents?.map((d: any) => {
            const id = d.name.split('/').pop();
            const fields: any = {};
            for (const k in d.fields) {
              const valObj = d.fields[k];
              fields[k] = valObj.stringValue || valObj.integerValue || valObj.doubleValue || valObj.booleanValue;
            }
            return { id, order_no: id, ...fields };
          }) || [];
          allDocs.push(...docs);
        }
      }
      return allDocs;
    } catch (restErr) {
      console.error("Firestore REST API fallback error:", restErr);
      return [];
    }
  } catch (err: any) {
    console.error("Firestore SDK get deposits error:", err);
    return [];
  }
}

async function getFirestoreWithdrawalsSafe(adminApp: any) {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return [];
  }
  try {
    const wthSnap = await Promise.race([
      adminApp.firestore().collection("withdrawals").limit(100).get(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 800))
    ]);
    return wthSnap?.docs?.map((d: any) => ({ id: d.id, withdrawNo: d.id, ...d.data() })) || [];
  } catch (err: any) {
    if (err?.message?.includes("Quota exceeded") || err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Firestore quota exceeded on withdrawals, activating circuit breaker for 60s");
      firestoreQuotaExceededUntil = Date.now() + 60000;
    }
    return [];
  }
}

// Guaranteed REST API Fallback for Firestore using public Firebase Applet API key
const FIREBASE_APPLET_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
let fbConfig: any = {};
if (fs.existsSync(FIREBASE_APPLET_CONFIG_PATH)) {
  try {
    fbConfig = JSON.parse(fs.readFileSync(FIREBASE_APPLET_CONFIG_PATH, "utf8"));
  } catch (e) {}
}

const FS_PROJECT_ID = fbConfig.projectId || "xbet-mobcash";
// Critical: If project ID is the xbet-mobcash (external), the database ID must be (default). 
// If it's the studio project, use the generated one. 
// However, we should also fallback to (default) if the specific one fails.
const TARGET_FIRESTORE_DATABASE_ID = (FS_PROJECT_ID === "xbet-mobcash") ? "(default)" : (fbConfig.firestoreDatabaseId || "(default)");
const FS_DB_ID = TARGET_FIRESTORE_DATABASE_ID;
const FS_API_KEY = fbConfig.apiKey || "AIzaSyAnjT1kOKf0WioVow4gQv63KUjIycn2FWI";

const paymentOrdersCache = new Map<string, { uid: string; username: string; phone: string; amount: number; time: number }>();

let firebaseAdminApp: any = null;

function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;

  try {
    const apps = getAdminApps();
    let app = apps.length > 0 ? apps[0] : null;

    if (!app) {
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (rawKey && rawKey.trim() !== "{}" && rawKey.trim() !== "") {
        try {
          const serviceAccount = JSON.parse(rawKey);
          if (serviceAccount && serviceAccount.project_id) {
            app = initAdminApp({
              credential: adminCert(serviceAccount as any),
              projectId: serviceAccount.project_id
            });
          }
        } catch (e: any) {
          console.error("Firebase Admin service account parse notice:", e?.message);
        }
      }

      // Initialize with Cloud project ID / Application Default Credentials
      if (!app) {
        try {
          app = initAdminApp({
            projectId: FS_PROJECT_ID
          });
        } catch (adcErr: any) {
          console.warn("Firebase Admin default init notice:", adcErr?.message);
        }
      }
    }

    if (app) {
      firebaseAdminApp = {
        app,
        apps: [app],
        firestore: () => getAdminFirestore(app, TARGET_FIRESTORE_DATABASE_ID),
        auth: () => getAdminAuth(app)
      };
      return firebaseAdminApp;
    }
  } catch (err: any) {
    console.error("Firebase Admin init error:", err?.message);
  }

  return null;
}

function getFirestoreDb() {
  const adminApp = getFirebaseAdmin();
  if (!adminApp) return null;
  try {
    return adminApp.firestore();
  } catch (err) {
    return null;
  }
}

async function firestoreRestPatch(collectionPath: string, docId: string, fields: Record<string, any>, targetDbId?: string): Promise<boolean> {
  try {
    const dbId = targetDbId || FS_DB_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT_ID}/databases/${dbId}/documents/${collectionPath}/${docId}?key=${FS_API_KEY}`;
    const firestoreFields: Record<string, any> = {};
    const updateMask: string[] = [];

    for (const [key, val] of Object.entries(fields)) {
      updateMask.push(`updateMask.fieldPaths=${encodeURIComponent(key)}`);
      if (typeof val === "boolean") {
        firestoreFields[key] = { booleanValue: val };
      } else if (typeof val === "number") {
        if (Number.isInteger(val)) {
          firestoreFields[key] = { integerValue: String(val) };
        } else {
          firestoreFields[key] = { doubleValue: val };
        }
      } else if (val === null || val === undefined) {
        firestoreFields[key] = { nullValue: null };
      } else {
        firestoreFields[key] = { stringValue: String(val) };
      }
    }

    const patchUrl = `${url}&${updateMask.join("&")}`;
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: firestoreFields })
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`[firestoreRestPatch] Error patching ${collectionPath}/${docId}:`, err?.message);
    return false;
  }
}

async function firestoreRestGet(collectionPath: string, docId: string, targetDbId?: string): Promise<Record<string, any> | null> {
  try {
    const dbId = targetDbId || FS_DB_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT_ID}/databases/${dbId}/documents/${collectionPath}/${docId}?key=${FS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const fields: Record<string, any> = {};
    if (data.fields) {
      for (const [k, v] of Object.entries<any>(data.fields)) {
        if (v.stringValue !== undefined) fields[k] = v.stringValue;
        else if (v.integerValue !== undefined) fields[k] = parseInt(v.integerValue, 10);
        else if (v.doubleValue !== undefined) fields[k] = v.doubleValue;
        else if (v.booleanValue !== undefined) fields[k] = v.booleanValue;
        else if (v.nullValue !== undefined) fields[k] = null;
      }
    }
    return fields;
  } catch (err: any) {
    return null;
  }
}

// Firebase Authentication Proxy to bypass ISP, DNS, or browser-level blocks on identitytoolkit/securetoken
app.use("/api/auth-proxy", async (req, res) => {
  try {
    const rawUrl = (req.originalUrl || req.url || "").replace(/^\/api\/auth-proxy\/?/, "");
    const slashIdx = rawUrl.indexOf("/");
    if (slashIdx === -1) {
      return res.status(400).json({ error: "Invalid proxy target" });
    }
    const host = rawUrl.substring(0, slashIdx);
    const pathAndQuery = rawUrl.substring(slashIdx + 1);
    const targetUrl = `https://${host}/${pathAndQuery}`;
    
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
    const bodyPayload = hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: bodyPayload
    });

    const bodyText = await response.text();
    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection', 'content-security-policy', 'access-control-allow-origin'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.send(bodyText);
  } catch (err: any) {
    console.error("[Auth Proxy Error]:", err?.message);
    res.status(500).json({ error: "Auth Proxy failed", message: err?.message });
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


// --- Transaction & User Storage & Verification ---

const TX_STORE_FILE = path.join(process.cwd(), "data", "transactions_store.json");
const USERS_STORE_FILE = path.join(process.cwd(), "data", "local_users_store.json");

function getLocalUsersStore(): Record<string, any> {
  try {
    if (fs.existsSync(USERS_STORE_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_STORE_FILE, "utf8")) || {};
    }
  } catch (e) {}
  return {};
}

function saveLocalUserStore(uid: string, profile: any) {
  try {
    if (!uid) return;
    const store = getLocalUsersStore();
    const existing = store[uid] || {};
    const updated = {
      ...existing,
      ...profile,
      uid,
      id: uid,
      updatedAt: new Date().toISOString()
    };
    store[uid] = updated;
    if (profile.username) {
      store[profile.username.toLowerCase()] = updated;
    }
    fs.writeFileSync(USERS_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save local user store:", e);
  }
}

function getLocalUserBalance(uidOrUsername: string): number {
  if (!uidOrUsername) return 777;
  const store = getLocalUsersStore();
  const key = uidOrUsername.toLowerCase();
  const user = store[uidOrUsername] || store[key];
  if (user && user.balance !== undefined) {
    return parseFloat(String(user.balance).replace(/,/g, "")) || 0;
  }
  const track = onlineUsersTracker.get(uidOrUsername);
  if (track && track.balance !== undefined) {
    return parseFloat(String(track.balance).replace(/,/g, "")) || 0;
  }
  return 777;
}

function recalculateUserDepositStats(uid: string): { totalDeposited: number, approvedDepositsCount: number } {
  if (!uid) return { totalDeposited: 0, approvedDepositsCount: 0 };
  const store = getLocalUsersStore();
  const userKey = uid.toLowerCase();
  const localUser = store[uid] || store[userKey];
  const username = localUser?.username || "";

  const localList = getLocalTransactions();
  const approvedDeposits = localList.filter((t: any) =>
    (t.uid === uid || (username && t.username?.toLowerCase() === username.toLowerCase())) &&
    t.type === "deposit" &&
    (t.status === "approved" || t.credited === true) &&
    t.status !== "cancelled" && t.status !== "rejected" && !t.cancelled
  );

  let totalDep = 0;
  let count = 0;
  approvedDeposits.forEach((t: any) => {
    totalDep += Number(t.amount || t.finalCredit || 0);
    count++;
  });

  if (localUser) {
    localUser.totalDeposited = totalDep;
    localUser.approvedDepositsCount = count;
    store[uid] = localUser;
    if (username) store[username.toLowerCase()] = localUser;
    try {
      fs.writeFileSync(USERS_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
    } catch (e) {}
  }

  return { totalDeposited: totalDep, approvedDepositsCount: count };
}

function updateLocalUserBalance(uidOrUsername: string, newBalance: string | number, amountAdded?: number, forceSet: boolean = false): any {
  if (!uidOrUsername) return null;
  const store = getLocalUsersStore();
  const userKey = uidOrUsername.toLowerCase();
  const existing = store[uidOrUsername] || store[userKey] || { uid: uidOrUsername, username: uidOrUsername, balance: "777.00" };
  
  const numBal = typeof newBalance === "number" ? newBalance : parseFloat(String(newBalance).replace(/,/g, ""));
  const strBal = numBal.toFixed(2);

  existing.balance = strBal;
  existing.updatedAt = new Date().toISOString();
  if (amountAdded && amountAdded > 0) {
    const stats = recalculateUserDepositStats(existing.uid || uidOrUsername);
    existing.totalDeposited = stats.totalDeposited;
    existing.approvedDepositsCount = stats.approvedDepositsCount;
  }

  const realUid = existing.uid || existing.id || uidOrUsername;
  store[realUid] = existing;
  if (existing.username) store[existing.username.toLowerCase()] = existing;

  try {
    fs.writeFileSync(USERS_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {}

  // Sync in-memory trackers
  const track = onlineUsersTracker.get(realUid) || onlineUsersTracker.get(uidOrUsername);
  if (track) {
    track.balance = strBal;
    onlineUsersTracker.set(realUid, track);
  }
  const cached = cachedUsersList.find(u => u.id === realUid || u.uid === realUid || u.username?.toLowerCase() === userKey);
  if (cached) {
    cached.balance = strBal;
  }

  return existing;
}

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
      
      let finalTxId = tx.transactionId;
      if (!finalTxId || String(finalTxId).startsWith("ORD") || String(finalTxId) === String(tx.order_no)) {
        if (existing.transactionId && !String(existing.transactionId).startsWith("ORD") && String(existing.transactionId) !== String(existing.order_no)) {
          finalTxId = existing.transactionId;
        }
      }

      list[idx] = {
        ...existing,
        ...tx,
        transactionId: finalTxId,
        trxSubmitted: Boolean(tx.trxSubmitted || existing.trxSubmitted || (finalTxId && !String(finalTxId).startsWith("ORD") && String(finalTxId).length >= 6)),
        status: isApproved ? "approved" : (isRejected ? "cancelled" : (tx.status || existing.status || "pending")),
        credited: isApproved ? true : (tx.credited || existing.credited || false),
        createdAt: existing.createdAt || tx.createdAt || existing.timestamp || tx.timestamp,
        timestamp: existing.timestamp || tx.timestamp || existing.createdAt || tx.createdAt,
        updatedAt: new Date().toISOString()
      };
    } else {
      const initialTxId = tx.transactionId;
      const hasRealTrx = Boolean(initialTxId && !String(initialTxId).startsWith("ORD") && String(initialTxId).length >= 6);
      const creationIso = tx.createdAt || tx.timestamp || (function() {
        const m = String(tx.id || tx.order_no || "").match(/ORD(\d{10,14})/i);
        return m ? new Date(parseInt(m[1], 10)).toISOString() : new Date().toISOString();
      })();
      list.unshift({
        ...tx,
        trxSubmitted: Boolean(tx.trxSubmitted || hasRealTrx),
        createdAt: creationIso,
        timestamp: tx.timestamp || creationIso
      });
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
    let tx = req.body;
    if (typeof tx === "string") {
      try {
        tx = JSON.parse(tx);
      } catch (e) {}
    }
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

    if (safeTx.type === "deposit" && (safeTx.order_no || safeTx.id)) {
      const orderKey = String(safeTx.order_no || safeTx.id);
      paymentOrdersCache.set(orderKey, {
        uid: safeTx.uid,
        username: safeTx.username || safeTx.uid,
        phone: safeTx.phone || safeTx.userPhone || "",
        amount: safeTx.amount || 0,
        time: Date.now()
      });
    }

    // Security check: Client cannot arbitrarily mark deposits as "approved"
    if (safeTx.type === "deposit") {
      const localList = getLocalTransactions();
      const existing = localList.find((item: any) => (item.id === docId || item.order_no === docId));
      const reqStatus = String(safeTx.status || "").toLowerCase();
      if (reqStatus === "cancelled" || reqStatus === "rejected" || reqStatus === "failed") {
        safeTx.status = "cancelled";
        safeTx.cancelled = true;
      } else if (existing && existing.status === "approved") {
        safeTx.status = "approved";
        safeTx.credited = true;
      } else {
        safeTx.status = "pending";
        // Check if verified SMS already arrived in verified_sms_pool
        if (safeTx.transactionId) {
          const candidateTrxId = String(safeTx.transactionId).toUpperCase().trim();
          const matchedSms = findMatchingSmsInPool(candidateTrxId, safeTx.amount);
          if (matchedSms && !matchedSms.claimed) {
            console.log(`[RECORD-TRANSACTION] Matched verified SMS in pool for ${candidateTrxId}! Auto-approving immediately!`);
            safeTx.status = "approved";
            safeTx.credited = true;
            safeTx.amount = matchedSms.amount || safeTx.amount;
            safeTx.finalCredit = safeTx.finalCredit || safeTx.amount;
            claimPoolSms(candidateTrxId, String(docId), safeTx.uid);
            await approveAndCreditDeposit(String(docId), matchedSms.amount || safeTx.amount, safeTx.uid);
          }
        }
      }
    }

    saveLocalTransaction(safeTx);
    console.log(`[RECORD-TRANSACTION SAVED] type=${safeTx.type} id=${safeTx.id} amount=${safeTx.amount} user=${safeTx.username} status=${safeTx.status}`);

    // Asynchronously sync to Firestore if admin app exists without blocking response
    (async () => {
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
          const db = adminApp.firestore();
          if (safeTx.type === "deposit") {
            const depRef = db.collection("deposits").doc(String(docId));
            await Promise.race([
              depRef.set(safeTx, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
            ]).catch(() => {});
          } else if (safeTx.type === "withdraw") {
            await Promise.race([
              db.collection("withdrawals").doc(String(docId)).set(safeTx, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
            ]).catch(() => {});
          }
          await Promise.race([
            db.collection("transactions").doc(String(docId)).set(safeTx, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
          ]).catch(() => {});
        }
      } catch (fbErr: any) {}
    })();

    return res.json({ success: true, status: safeTx.status, id: docId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Dedicated endpoint to record submitted user transaction ID immediately
app.post("/api/submit-trxid", async (req, res) => {
  try {
    const { order_no, transactionId, senderNumber, uid, username, amount, method } = req.body || {};
    const cleanOrderNo = String(order_no || "").replace(/^ProPay-/i, "").trim();
    const cleanTrxId = String(transactionId || "").replace(/^ProPay-/i, "").trim();
    if (!cleanOrderNo || !cleanTrxId) {
      return res.status(400).json({ success: false, error: "Missing order_no or transactionId" });
    }

    const localList = getLocalTransactions();
    const idx = localList.findIndex((item: any) => (
      item.id === cleanOrderNo || item.order_no === cleanOrderNo || item.depositNo === cleanOrderNo
    ));

    const existing = idx >= 0 ? localList[idx] : {};
    const nowIso = new Date().toISOString();
    const updatedDep = {
      ...existing,
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      depositNo: cleanOrderNo,
      orderId: cleanOrderNo,
      serialNo: cleanOrderNo,
      type: "deposit",
      transactionId: cleanTrxId,
      trxSubmitted: true,
      senderNumber: senderNumber || existing.senderNumber || "Manual",
      uid: uid || existing.uid || "",
      username: username || existing.username || "User",
      amount: Number(amount || existing.amount || 0),
      finalCredit: Number(existing.finalCredit || amount || existing.amount || 0),
      method: method || existing.method || "bkash",
      status: (existing.status === "approved" || existing.status === "success") ? "approved" : "pending",
      submittedAt: nowIso,
      updatedAt: nowIso
    };

    saveLocalTransaction(updatedDep);
    console.log(`[SUBMIT-TRXID] Order ${cleanOrderNo} updated with TrxID: ${cleanTrxId} for user ${updatedDep.username}`);

    // Update Firestore deposits & transactions collections immediately
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).set(updatedDep, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => {});
        await Promise.race([
          db.collection("transactions").doc(cleanOrderNo).set(updatedDep, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => {});
      }
    } catch (e) {}

    return res.json({ success: true, order_no: cleanOrderNo, transactionId: cleanTrxId, deposit: updatedDep });
  } catch (err: any) {
    console.error("[SUBMIT-TRXID ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to cancel a transaction immediately across local store and database
app.post("/api/cancel-transaction", async (req, res) => {
  try {
    const { order_no, id, uid } = req.body || {};
    const targetId = String(order_no || id || "").replace(/^ProPay-/i, "").trim();
    if (!targetId) {
      return res.status(400).json({ error: "Missing order_no or id" });
    }

    // 1. Update in local storage
    const localList = getLocalTransactions();
    let modified = false;
    for (const tx of localList) {
      const txId = String(tx.id || tx.order_no || tx.transactionId || "").replace(/^ProPay-/i, "");
      if (txId === targetId || tx.id === targetId || tx.order_no === targetId) {
        if (tx.status !== "approved" && tx.status !== "success" && tx.credited !== true) {
          tx.status = "cancelled";
          tx.cancelled = true;
          tx.updatedAt = new Date().toISOString();
          modified = true;
        }
      }
    }
    // 2. Recalculate deposit stats so cancelled deposit is excluded from totalDeposited
    let targetUid = uid;
    if (!targetUid) {
      const found = localList.find((tx: any) => tx.id === targetId || tx.order_no === targetId);
      if (found) targetUid = found.uid;
    }
    let stats = { totalDeposited: 0, approvedDepositsCount: 0 };
    if (targetUid) {
      stats = recalculateUserDepositStats(targetUid);
    }

    // 3. Update Firestore if accessible
    (async () => {
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          const cancelPayload = { status: "cancelled", cancelled: true, updatedAt: new Date().toISOString() };
          const userStatsPayload = { totalDeposited: stats.totalDeposited, approvedDepositsCount: stats.approvedDepositsCount, updatedAt: new Date().toISOString() };
          await Promise.allSettled([
            db.collection("deposits").doc(targetId).set(cancelPayload, { merge: true }),
            db.collection("transactions").doc(targetId).set(cancelPayload, { merge: true }),
            targetUid ? db.collection("users").doc(targetUid).set(userStatsPayload, { merge: true }) : Promise.resolve(),
            targetUid ? db.collection("users").doc(targetUid).collection("history").doc(targetId).set(cancelPayload, { merge: true }) : Promise.resolve()
          ]);
        }
      } catch (fbErr: any) {}
    })();

    return res.json({ success: true, status: "cancelled", id: targetId });
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
        firestoreList = await getFirestoreWithdrawalsSafe(adminApp);
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
        firestoreList = await getFirestoreDepositsSafe(adminApp);
      }
    } catch (e) {}

    const map = new Map<string, any>();
    for (const item of [...firestoreList, ...localList]) {
      const orderNo = item.order_no || item.id || item.depositNo || item.serialNo || item.doc_id;
      if (!orderNo) continue;
      if (
        String(item.username || "").toLowerCase() === "sohel168" ||
        String(orderNo).includes("1791043130093") ||
        String(orderNo).includes("1791048421264")
      ) {
        continue;
      }
      const key = String(orderNo).replace(/^ProPay-/i, "");
      const existing = map.get(key) || {};

      let realTxId = "";
      const itemTxId = String(item.transactionId || "").replace(/^ProPay-/i, "").trim();
      const exTxId = String(existing.transactionId || "").replace(/^ProPay-/i, "").trim();

      if (itemTxId && !itemTxId.startsWith("ORD") && itemTxId !== key) {
        realTxId = itemTxId;
      } else if (exTxId && !exTxId.startsWith("ORD") && exTxId !== key) {
        realTxId = exTxId;
      }

      const isTrxSubmitted = Boolean(
        item.trxSubmitted || existing.trxSubmitted || (realTxId && realTxId.length >= 6)
      );

      const isApproved = item.status === "approved" || existing.status === "approved" || item.status === "success" || existing.status === "success" || Boolean(item.credited || existing.credited || item.balanceCredited || existing.balanceCredited);
      const isRejected = !isApproved && (item.status === "rejected" || existing.status === "rejected" || item.status === "cancelled" || existing.status === "cancelled");
      const finalStatus = isApproved ? "approved" : (isRejected ? "cancelled" : (item.status || existing.status || "pending"));

      map.set(key, {
        ...existing,
        ...item,
        status: finalStatus,
        credited: isApproved,
        balanceCredited: isApproved,
        id: key,
        order_no: key,
        orderId: key,
        depositNo: key,
        serialNo: key,
        transactionId: realTxId || (itemTxId || exTxId || ""),
        trxSubmitted: isTrxSubmitted
      });
    }

    const deposits = Array.from(map.values()).sort((a: any, b: any) => {
      const ta = new Date(a.submittedAt || a.timestamp || a.createdAt || 0).getTime();
      const tb = new Date(b.submittedAt || b.timestamp || b.createdAt || 0).getTime();
      return tb - ta;
    });
    return res.json({ success: true, deposits });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Live User Presence tracking
interface UserPresenceRecord {
  uid: string;
  username: string;
  lastActiveTime: number;
  isOnline: boolean;
  deviceId?: string;
  deviceInfo?: string;
  phone?: string;
  balance?: string | number;
}
const onlineUsersTracker = new Map<string, UserPresenceRecord>();

function getOnlineUsersCount(): number {
  const now = Date.now();
  let count = 0;
  for (const [uid, user] of onlineUsersTracker.entries()) {
    if (user.isOnline && now - user.lastActiveTime < 150000) {
      count++;
    } else if (now - user.lastActiveTime >= 300000) {
      onlineUsersTracker.delete(uid);
    }
  }
  return count;
}

// Secure & resilient server-side registration endpoint
app.post("/api/register-user", async (req, res) => {
  try {
    const { username, password, phone, deviceId, deviceInfo, referralCode, lastIp } = req.body || {};
    if (!username || !password || !phone) {
      return res.status(400).json({ success: false, error: "ইউজারনেম, পাসওয়ার্ড এবং ফোন নাম্বার প্রদান করুন।" });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanPhone = String(phone).replace(/\D/g, "");
    let stdPhone = cleanPhone;
    if (stdPhone.length === 10 && stdPhone.startsWith("1")) {
      stdPhone = "0" + stdPhone;
    }

    if (stdPhone.length !== 11 || !/^01[3-9]\d{8}$/.test(stdPhone)) {
      return res.status(400).json({ success: false, error: "দয়া করে সঠিক ১১ সংখ্যার মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX)" });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "সার্ভার ডাটাবেস সংযোগে সমস্যা হয়েছে।" });
    }

    const db = adminApp.firestore();
    const auth = adminApp.auth();

    const email = `${cleanUsername.toLowerCase().replace(/\s+/g, '')}@sn777.com`;

    // 1. Check if phone already used in Firestore
    try {
      const phoneSnap = await db.collection("users").where("phone", "in", [stdPhone, "+880 " + stdPhone, "+880" + stdPhone, stdPhone.slice(1)]).limit(1).get();
      if (!phoneSnap.empty) {
        return res.status(400).json({ success: false, error: "এই মোবাইল নাম্বারটি ইতিমধ্যে ব্যবহৃত হয়েছে! একটি মোবাইল নাম্বারে একবারই একাউন্ট খোলা যাবে।" });
      }
    } catch (e) {}

    // 2. Check if username already exists in Firestore
    try {
      const userSnap = await db.collection("users").where("username", "==", cleanUsername).limit(1).get();
      if (!userSnap.empty) {
        return res.status(400).json({ success: false, error: "এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য একটি ব্যবহার করুন।" });
      }
    } catch (e) {}

    // 3. Create or get user in Firebase Auth
    let uid = "";
    try {
      const newAuthUser = await auth.createUser({
        email,
        password: cleanPassword,
        displayName: cleanUsername
      });
      uid = newAuthUser.uid;
    } catch (authErr: any) {
      if (authErr.code === "auth/email-already-exists") {
        try {
          const existingAuth = await auth.getUserByEmail(email);
          if (existingAuth) {
            const existingDoc = await db.collection("users").doc(existingAuth.uid).get();
            if (!existingDoc.exists || !existingDoc.data()?.username || existingDoc.data()?.username === "User") {
              uid = existingAuth.uid;
              await auth.updateUser(uid, { password: cleanPassword }).catch(() => {});
            } else {
              return res.status(400).json({ success: false, error: "এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য একটি ব্যবহার করুন।" });
            }
          }
        } catch (e) {
          return res.status(400).json({ success: false, error: "এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য একটি ব্যবহার করুন।" });
        }
      } else {
        return res.status(400).json({ success: false, error: authErr.message || "রেজিস্ট্রেশন করতে সমস্যা হয়েছে।" });
      }
    }

    // 4. Handle referral parent if provided
    let parentId = "";
    if (referralCode) {
      try {
        const refSnap = await db.collection("users").where("inviteCode", "==", referralCode.trim()).limit(1).get();
        if (!refSnap.empty) {
          parentId = refSnap.docs[0].id;
          const parentData = refSnap.docs[0].data();
          const currentBal = parseFloat(parentData.balance || "0.00") + 50;
          await refSnap.docs[0].ref.set({
            balance: currentBal.toFixed(2),
            referralEarnings: (parentData.referralEarnings || 0) + 50,
            totalReferrals: (parentData.totalReferrals || 0) + 1
          }, { merge: true }).catch(() => {});
        }
      } catch (e) {}
    }

    // 5. Write complete user profile to Firestore via Admin SDK
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const inviteCode = "sn_" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const userProfile = {
      name: cleanUsername,
      username: cleanUsername,
      email,
      phone: stdPhone,
      password: cleanPassword,
      birthday: "১৯৯৮/০১/০১",
      rank: "Bronze",
      points: 0,
      balance: "777.00",
      testCoin: 0,
      totalDeposited: 0,
      approvedDepositsCount: 0,
      adminApproved: false,
      withdrawEnabled: false,
      status: "active",
      isBlocked: false,
      parentId: parentId || "",
      rewardTier: parentId ? 1 : 0,
      inviteCode,
      referralEarnings: 0,
      totalReferrals: 0,
      personalWinRate: 50,
      role: cleanUsername.toLowerCase() === "admin" ? "admin" : "user",
      registrationDate: nowIso,
      deviceId: deviceId || "",
      deviceInfo: deviceInfo || "Android Device",
      lastIp: lastIp || (req.headers["x-forwarded-for"] as string) || req.ip || "",
      lastActive: nowIso,
      lastActiveTime: nowMs,
      isOnline: true
    };

    await db.collection("users").doc(uid).set(userProfile, { merge: true });

    // Update in-memory trackers
    onlineUsersTracker.set(uid, {
      uid,
      username: cleanUsername,
      phone: stdPhone,
      balance: "777.00",
      deviceInfo: deviceInfo || "Android Device",
      deviceId: deviceId || "",
      lastActiveTime: nowMs,
      isOnline: true
    });

    cachedUsersList = [{ id: uid, uid, ...userProfile }, ...cachedUsersList.filter(u => u.id !== uid)];

    return res.json({
      success: true,
      user: {
        uid,
        username: cleanUsername,
        email,
        phone: stdPhone,
        balance: "777.00"
      }
    });
  } catch (err: any) {
    console.error("Register user error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/user-presence", async (req, res) => {
  try {
    const { uid, username, isOnline, lastActiveTime, deviceId, deviceInfo, phone, balance, email } = req.body || {};
    if (!uid) return res.json({ success: false, error: "Missing uid" });

    const now = lastActiveTime ? Number(lastActiveTime) : Date.now();
    const online = isOnline !== false;

    let resolvedUsername = username;
    if (!resolvedUsername || resolvedUsername === "User" || resolvedUsername === "Unknown") {
      if (email && email.includes("@")) {
        resolvedUsername = email.split("@")[0];
      }
    }

    const existing = onlineUsersTracker.get(uid) || { uid, username: resolvedUsername || "User", lastActiveTime: 0, isOnline: false };
    onlineUsersTracker.set(uid, {
      ...existing,
      uid,
      username: resolvedUsername || existing.username || "User",
      lastActiveTime: now,
      isOnline: online,
      ...(deviceId ? { deviceId } : {}),
      ...(deviceInfo ? { deviceInfo } : {}),
      ...(phone ? { phone } : {}),
      ...(balance !== undefined ? { balance } : {})
    });

    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const userUpdate: any = {
        isOnline: online,
        lastActive: new Date(now).toISOString(),
        lastActiveTime: now,
        ...(deviceInfo ? { deviceInfo } : {}),
        ...(deviceId ? { deviceId } : {})
      };
      adminApp.firestore().collection("users").doc(uid).set(userUpdate, { merge: true }).catch(() => {});
    }

    return res.json({
      success: true,
      uid,
      isOnline: online,
      onlineCount: getOnlineUsersCount()
    });
  } catch (e: any) {
    return res.json({ success: false, error: e.message });
  }
});

let cachedUsersList: any[] = [];
let lastUsersFetch = 0;

app.get("/api/admin/all-users", async (req, res) => {
  try {
    const now = Date.now();
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.json({ success: true, users: cachedUsersList, onlineCount: getOnlineUsersCount() });
    }

    if (now - lastUsersFetch > 3000 || cachedUsersList.length === 0) {
      if (now >= firestoreQuotaExceededUntil) {
        try {
          const snap = await Promise.race([
            adminApp.firestore().collection("users").limit(500).get(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 6000))
          ]);
          if (snap && snap.docs) {
            cachedUsersList = snap.docs.map((d: any) => ({ id: d.id, uid: d.id, ...d.data() }));
            lastUsersFetch = now;
          }
        } catch (err: any) {
          if (err?.message?.includes("Quota exceeded") || err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
            firestoreQuotaExceededUntil = Date.now() + 60000;
          }
        }
      }
    }

    const usersMap = new Map<string, any>();
    cachedUsersList.forEach(u => usersMap.set(u.id || u.uid, { ...u }));

    const localStore = getLocalUsersStore();
    for (const [k, v] of Object.entries<any>(localStore)) {
      if (v && (v.uid || v.id)) {
        const uId = v.uid || v.id;
        const ex = usersMap.get(uId) || {};
        usersMap.set(uId, { ...ex, ...v, id: uId, uid: uId });
      }
    }

    for (const [uid, track] of onlineUsersTracker.entries()) {
      if (!usersMap.has(uid)) {
        usersMap.set(uid, {
          id: uid,
          uid,
          username: track.username || "User",
          phone: track.phone || "",
          deviceInfo: track.deviceInfo || "",
          lastActiveTime: track.lastActiveTime,
          isOnline: track.isOnline
        });
      }
    }

    const mergedUsers = Array.from(usersMap.values()).map(u => {
      const track = onlineUsersTracker.get(u.id || u.uid);
      let lastActiveTime = u.lastActiveTime;
      if (!lastActiveTime && u.lastActive) {
        lastActiveTime = u.lastActive.toDate ? u.lastActive.toDate().getTime() : new Date(u.lastActive).getTime();
      }
      if (track && track.lastActiveTime > (lastActiveTime || 0)) {
        lastActiveTime = track.lastActiveTime;
      }

      const isOnline = (track && track.isOnline && (now - track.lastActiveTime < 150000)) ||
                       (u.isOnline !== false && lastActiveTime && (now - lastActiveTime < 150000));

      let resolvedUsername = u.username;
      if (!resolvedUsername || resolvedUsername === "User" || resolvedUsername === "Unknown") {
        if (track && track.username && track.username !== "User") {
          resolvedUsername = track.username;
        } else if (u.email && u.email.includes("@")) {
          resolvedUsername = u.email.split("@")[0];
        }
      }

      return {
        ...u,
        username: resolvedUsername || "User",
        name: u.name || resolvedUsername || "User",
        status: u.status || "active",
        balance: u.balance !== undefined ? u.balance : "777.00",
        phone: u.phone || track?.phone || "",
        lastActiveTime: lastActiveTime || 0,
        isOnline: !!isOnline
      };
    });

    mergedUsers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const tA = a.registrationDate ? new Date(a.registrationDate).getTime() : (a.lastActiveTime || 0);
      const tB = b.registrationDate ? new Date(b.registrationDate).getTime() : (b.lastActiveTime || 0);
      return tB - tA;
    });

    return res.json({
      success: true,
      users: mergedUsers,
      total: mergedUsers.length,
      onlineCount: mergedUsers.filter(u => u.isOnline).length
    });
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
        const results = await Promise.race([
          Promise.all(queries),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 800))
        ]).catch(() => []);
        for (const snap of results) {
          if (snap && snap.docs) {
            snap.docs.forEach((d: any) => {
              const data = d.data();
              const isWth = data.type === "withdraw" || !!data.withdrawNo;
              const isDep = !isWth && (data.type === "deposit" || !!data.depositNo || String(d.id).startsWith("ORD") || String(d.id).startsWith("dep"));
              const safeExtractIso = (val: any) => {
                if (!val) return null;
                if (typeof val === "object" && (val.seconds || val._seconds)) {
                  return new Date((val.seconds || val._seconds) * 1000).toISOString();
                }
                if (typeof val === "string" || typeof val === "number") {
                  const dt = new Date(val);
                  if (!isNaN(dt.getTime())) return dt.toISOString();
                }
                return null;
              };
              const ordMatch = String(d.id || data.order_no || "").match(/ORD(\d{10,14})/i);
              const ordIso = ordMatch ? new Date(parseInt(ordMatch[1], 10)).toISOString() : null;
              const realCreationIso = safeExtractIso(data.createdAt) || safeExtractIso(data.timestamp) || ordIso || new Date().toISOString();

              firestoreList.push({
                ...data,
                id: d.id,
                type: isWth ? "withdraw" : (isDep ? "deposit" : (data.type || "deposit")),
                status: data.status || "pending",
                amount: Number(data.amount || 0),
                displayAmount: Number(data.amount || 0),
                method: data.method || data.bankName || data.paymentMethod || (isWth ? "Nagad" : "Bkash"),
                createdAt: realCreationIso,
                timestamp: realCreationIso
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
      if (
        (username.toLowerCase() === "sohel168" && item.type === "deposit") ||
        String(item.id || item.order_no || "").includes("1791043130093") ||
        String(item.id || item.order_no || "").includes("1791048421264")
      ) {
        continue;
      }
      const key = String(item.id || item.order_no || item.depositNo || item.withdrawNo || (item.timestamp + "_" + item.amount)).replace(/^ProPay-/i, "");
      const cleanTxId = String(item.transactionId || item.order_no || key).replace(/^ProPay-/i, "");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, id: key, transactionId: cleanTxId });
      } else {
        const isRejected = existing.status === "rejected" || existing.status === "cancelled" || existing.status === "failed" || existing.status === 2 ||
                           item.status === "rejected" || item.status === "cancelled" || item.status === "failed" || item.status === 2 ||
                           key.includes("1791043130093");
        const isApproved = !isRejected && (existing.status === "approved" || existing.status === "success" || existing.status === 1 || existing.credited === true ||
                           item.status === "approved" || item.status === "success" || item.status === 1 || item.credited === true);
        const timeExisting = getTxCreationTime(existing);
        const timeItem = getTxCreationTime(item);
        const earliestTime = (timeExisting > 0 && timeItem > 0) ? Math.min(timeExisting, timeItem) : (timeExisting || timeItem || Date.now());
        const earliestIso = new Date(earliestTime).toISOString();

        map.set(key, {
          ...existing,
          ...item,
          id: key,
          transactionId: cleanTxId,
          createdAt: existing.createdAt || item.createdAt || earliestIso,
          timestamp: existing.timestamp || item.timestamp || earliestIso,
          status: isApproved ? "approved" : (isRejected ? "cancelled" : (item.status || existing.status || "pending")),
          credited: isApproved ? true : (item.credited || existing.credited || false)
        });
      }
    }

    const getTxCreationTime = (t: any) => {
      if (!t) return 0;
      const idStr = String(t.id || t.order_no || t.orderId || t.depositNo || t.withdrawNo || "");
      const m = idStr.match(/ORD(\d{10,14})/i);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > 1600000000000 && num < 2500000000000) return num;
      }
      if (t.createdAt) {
        const time = new Date(t.createdAt).getTime();
        if (!isNaN(time) && time > 0) return time;
      }
      if (t.timestamp) {
        const time = new Date(t.timestamp).getTime();
        if (!isNaN(time) && time > 0) return time;
      }
      return 0;
    };

    const merged = Array.from(map.values()).sort((a, b) => {
      return getTxCreationTime(b) - getTxCreationTime(a);
    });

    return res.json({ transactions: merged });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Persistent Bank Accounts Storage
const BANK_ACCOUNTS_FILE = path.join(appDir, "data", "bank_accounts.json");

function getLocalBankAccounts(): Record<string, any[]> {
  try {
    if (!fs.existsSync(path.join(appDir, "data"))) {
      fs.mkdirSync(path.join(appDir, "data"), { recursive: true });
    }
    if (fs.existsSync(BANK_ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(BANK_ACCOUNTS_FILE, "utf8")) || {};
    }
  } catch (e) {
    console.error("Error reading BANK_ACCOUNTS_FILE:", e);
  }
  return {};
}

function saveLocalBankAccounts(data: Record<string, any[]>) {
  try {
    if (!fs.existsSync(path.join(appDir, "data"))) {
      fs.mkdirSync(path.join(appDir, "data"), { recursive: true });
    }
    fs.writeFileSync(BANK_ACCOUNTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving BANK_ACCOUNTS_FILE:", e);
  }
}

// GET /api/user-bank-accounts
app.get("/api/user-bank-accounts", async (req, res) => {
  try {
    const uid = String(req.query.uid || req.query.userId || "").trim();
    const username = String(req.query.username || "").trim();
    const phone = String(req.query.phone || "").trim();

    const localMap = getLocalBankAccounts();
    let accounts: any[] = [];

    // 1. Check local file store first (instant)
    if (uid && localMap[uid]) accounts = localMap[uid];
    else if (username && localMap[username]) accounts = localMap[username];
    else if (phone && localMap[phone]) accounts = localMap[phone];

    // 2. Check Firestore with 800ms circuit breaker timeout
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        let firestoreAccounts: any[] = [];

        if (uid) {
          const userDoc = await Promise.race([
            db.collection("users").doc(uid).get(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (userDoc && userDoc.exists && userDoc.data()?.bankAccounts) {
            firestoreAccounts = userDoc.data()?.bankAccounts || [];
          }
        }
        if (firestoreAccounts.length === 0 && username) {
          const snap = await Promise.race([
            db.collection("users").where("username", "==", username).limit(1).get(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (snap && !snap.empty) {
            firestoreAccounts = snap.docs[0].data()?.bankAccounts || [];
          }
        }
        if (firestoreAccounts.length === 0 && (uid || username)) {
          const bankDoc = await Promise.race([
            db.collection("user_bank_accounts").doc(uid || username).get(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (bankDoc && bankDoc.exists && bankDoc.data()?.accounts) {
            firestoreAccounts = bankDoc.data()?.accounts || [];
          }
        }

        if (Array.isArray(firestoreAccounts) && firestoreAccounts.length > 0) {
          // Merge with local accounts
          const map: Record<string, any> = {};
          accounts.forEach((a: any) => { if (a && a.id) map[a.id] = a; });
          firestoreAccounts.forEach((a: any) => { if (a && a.id) map[a.id] = a; });
          accounts = Object.values(map);

          // Update local file cache
          if (uid) localMap[uid] = accounts;
          if (username) localMap[username] = accounts;
          if (phone) localMap[phone] = accounts;
          saveLocalBankAccounts(localMap);
        }
      }
    } catch (e: any) {
      console.warn("Firestore bank account fetch error:", e?.message);
    }

    return res.json({ success: true, accounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/user-bank-accounts
app.post("/api/user-bank-accounts", async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const uid = String(body.uid || body.userId || "").trim();
    const username = String(body.username || "").trim();
    const phone = String(body.phone || "").trim();
    const action = String(body.action || "save").toLowerCase();
    const incomingAccounts = Array.isArray(body.accounts) ? body.accounts : [];
    const newAccount = body.newAccount || body.account;
    const deletedId = body.deletedId || body.accountId;

    const localMap = getLocalBankAccounts();
    const key = uid || username || phone || "default_user";
    let currentAccounts: any[] = localMap[key] || [];

    if (incomingAccounts.length > 0) {
      currentAccounts = incomingAccounts;
    } else if (action === "delete" && deletedId) {
      currentAccounts = currentAccounts.filter((a: any) => a.id !== deletedId);
    } else if (newAccount && newAccount.id) {
      currentAccounts = [newAccount, ...currentAccounts.filter((a: any) => a.id !== newAccount.id && a.methodId !== newAccount.methodId)];
    }

    // Save to local file store immediately
    if (uid) localMap[uid] = currentAccounts;
    if (username) localMap[username] = currentAccounts;
    if (phone) localMap[phone] = currentAccounts;
    localMap[key] = currentAccounts;
    saveLocalBankAccounts(localMap);

    // Save to Firestore asynchronously in background without blocking response
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        if (uid) {
          db.collection("users").doc(uid).set({ bankAccounts: currentAccounts }, { merge: true }).catch(() => {});
          db.collection("user_bank_accounts").doc(uid).set({ accounts: currentAccounts, username, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
        if (username) {
          db.collection("users").where("username", "==", username).limit(1).get().then(snap => {
            if (snap && !snap.empty) {
              snap.docs[0].ref.set({ bankAccounts: currentAccounts }, { merge: true }).catch(() => {});
            }
          }).catch(() => {});
          db.collection("user_bank_accounts").doc(username).set({ accounts: currentAccounts, uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      }
    } catch (e: any) {
      console.warn("Firestore bank account save error:", e?.message);
    }

    return res.json({ success: true, accounts: currentAccounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update Auth & Firestore Profile Endpoint
app.post("/api/update-auth", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername, newPassword, newPhone, name, birthday } = req.body;
    console.log(`DEBUG: /api/update-auth request body:`, { uid, newUsername, newPassword, newPhone, name, birthday });

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const authUpdate: any = {};
    const firestoreUpdate: any = {};
    if (name !== undefined) {
      firestoreUpdate.name = String(name).trim();
    }
    if (birthday !== undefined) {
      firestoreUpdate.birthday = String(birthday).trim();
    }
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
      // Validate username
      const _uName = newUsername.trim();
      const _uLen = _uName.length;
      if (_uLen < 3 || _uLen > 20) {
        return res.status(400).json({ error: "ইউজারনেম ৩ থেকে ২০ অক্ষরের মধ্যে হতে হবে।" });
      }

      authUpdate.email = `${newUsername.toLowerCase().replace(/\s+/g, '')}@sn777.com`;
      firestoreUpdate.username = newUsername;
      firestoreUpdate.email = authUpdate.email; // Save the email to Firestore
    }
    if (newPassword) {
      authUpdate.password = newPassword;
      firestoreUpdate.password = newPassword;
    }
    if (newPhone) {
      // Validate phone: strip non-digits and normalize BD mobile
      let cleanPhone = newPhone.toString().replace(/\D/g, '');
      if (cleanPhone.startsWith("880")) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith("88")) {
        cleanPhone = cleanPhone.slice(2);
      }
      if (cleanPhone.length === 10 && cleanPhone.startsWith("1")) {
        cleanPhone = "0" + cleanPhone;
      }
      if (cleanPhone.length !== 11 || !/^01[3-9]\d{8}$/.test(cleanPhone)) {
        return res.status(400).json({ error: "দয়া করে সঠিক ১১ সংখ্যার মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX)!" });
      }

      // Check if phone number is already registered
      const usersRef = db.collection("users");
      const phoneQuery = await usersRef.where("phone", "==", `+880 ${cleanPhone}`).get();
      if (!phoneQuery.empty) {
         // Check if this phone belongs to someone else
         const existingUser = phoneQuery.docs[0];
         if (existingUser.id !== uid) {
             return res.status(400).json({ error: "এই মোবাইল নাম্বারটি ইতিমধ্যে অন্য একাউন্টে ব্যবহৃত হয়েছে!" });
         }
      }

      firestoreUpdate.phone = `+880 ${cleanPhone}`;
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
    
    // 2. Update Firestore
    if (Object.keys(firestoreUpdate).length > 0) {
      console.log(`DEBUG: Updating Firestore for user ${uid} with data:`, { ...firestoreUpdate, password: '***' });
      await userDocRef.set(firestoreUpdate, { merge: true });
      console.log(`DEBUG: Firestore updated successfully for user ${uid}.`);
    }

    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err: any) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});


// Server-side Telegram Proxy Endpoint for Live Chat
const SN_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8936057718:AAHzK6X2GIvIe9qSncl53pfrUBFB-nUR4U8";
const SN_GROUP_ID = process.env.TELEGRAM_GROUP_ID || "-1003806717205";

// In-memory store for admin replies indexed by userId / username
const userRepliesStore = new Map<string, Array<{ id: number; text: string; time: string }>>();
// Map Telegram sent message_id -> userId/username
const sentMessageToUserMap = new Map<number, { userId: string; username: string }>();
let globalTgOffset = 0;
let lastWebhookCheck = 0;

// Helper function for reliable Telegram API calls with automatic retry
async function safeFetchJsonWithRetry(url: string, options: any = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      const json = await response.json();
      if (json && json.ok) return json;
      if (attempt === maxRetries) return json || { ok: false, description: "Invalid response from Telegram API" };
    } catch (err: any) {
      if (attempt === maxRetries) {
        return { ok: false, description: err.message || "fetch failed" };
      }
      await new Promise(r => setTimeout(r, 600));
    }
  }
  return { ok: false, description: "Fetch failed after retries" };
}

function storeUserReply(targetKey: string, replyId: number, replyText: string, timeStr: string) {
  if (!targetKey) return;
  const normalizedKey = targetKey.trim().toLowerCase();
  if (!userRepliesStore.has(normalizedKey)) {
    userRepliesStore.set(normalizedKey, []);
  }
  const list = userRepliesStore.get(normalizedKey)!;
  // avoid exact duplicates
  if (!list.some(item => item.id === replyId)) {
    list.push({ id: replyId, text: replyText, time: timeStr });
    if (list.length > 50) list.shift();
    console.log(`[TelegramChat] Stored admin reply for "${normalizedKey}": "${replyText}"`);
  }
}

// Background polling of Telegram updates
async function pollTelegramUpdates() {
  try {
    const now = Date.now();
    // Periodically ensure no stale webhook is blocking getUpdates
    if (now - lastWebhookCheck > 60000) {
      lastWebhookCheck = now;
      safeFetchJsonWithRetry(`https://api.telegram.org/bot${SN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`, { method: "GET" }, 1).catch(() => {});
    }

    const url = `https://api.telegram.org/bot${SN_BOT_TOKEN}/getUpdates?offset=${globalTgOffset + 1}&timeout=2`;
    const res = await safeFetchJsonWithRetry(url, { method: "GET" }, 1).catch(() => null);

    // If 409 conflict with webhook, force delete webhook
    if (res && !res.ok && res.error_code === 409) {
      await safeFetchJsonWithRetry(`https://api.telegram.org/bot${SN_BOT_TOKEN}/deleteWebhook`, { method: "GET" }, 1).catch(() => {});
      return;
    }

    if (res && res.ok && Array.isArray(res.result) && res.result.length > 0) {
      for (const update of res.result) {
        globalTgOffset = update.update_id;
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const msgText = String(msg.text).trim();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let matchedTarget = false;

        // Method 1: Admin directly "Reply" to the user's message in Telegram
        if (msg.reply_to_message) {
          const repliedMsgId = msg.reply_to_message.message_id;
          const mapped = sentMessageToUserMap.get(repliedMsgId);
          if (mapped) {
            storeUserReply(mapped.userId, update.update_id, msgText, timeStr);
            if (mapped.username && mapped.username !== mapped.userId) {
              storeUserReply(mapped.username, update.update_id, msgText, timeStr);
            }
            matchedTarget = true;
          } else {
            // Check text of replied message for User ID or Name
            const originalText = msg.reply_to_message.text || msg.reply_to_message.caption || "";
            const idMatch = originalText.match(/🆔 User ID:\s*([^\n\r]+)/i);
            const nameMatch = originalText.match(/👤 Name:\s*([^\n\r]+)/i);
            if (idMatch && idMatch[1]) {
              const uId = idMatch[1].trim();
              storeUserReply(uId, update.update_id, msgText, timeStr);
              matchedTarget = true;
            }
            if (nameMatch && nameMatch[1]) {
              const uName = nameMatch[1].trim();
              storeUserReply(uName, update.update_id, msgText, timeStr);
              matchedTarget = true;
            }
          }
        }

        // Method 2: Admin writes with prefix, e.g. "Suya120: হ্যালো" or "Suya120 হ্যালো" or "Guest_1234: হ্যালো"
        if (!matchedTarget) {
          const prefixMatch = msgText.match(/^([a-zA-Z0-9_\-\u0980-\u09FF]+)[:\s]+(.+)$/s);
          if (prefixMatch) {
            const targetId = prefixMatch[1].trim();
            const replyContent = prefixMatch[2].trim();
            if (targetId && replyContent) {
              storeUserReply(targetId, update.update_id, replyContent, timeStr);
              matchedTarget = true;
            }
          }
        }
      }
    }
  } catch (e) {
    // Silent fail
  }
}

// Poll Telegram every 2 seconds
setInterval(pollTelegramUpdates, 2000);

app.post("/api/send-telegram", express.json({limit: "10mb"}), async (req, res) => {
  try {
    const { name, userId, balance, deposit, message } = req.body;
    const cleanUser = String(userId || name || "Guest").trim();
    const cleanName = String(name || "User").trim();

    const payloadText = 
      "📩 New Live Message\n" +
      "🌐 Site: Sn777.site\n" +
      "👤 Name: " + cleanName + "\n" +
      "🆔 User ID: " + cleanUser + "\n" +
      "💰 Balance: " + (balance || "৳0.00") + "\n" +
      "💳 Total Deposit: " + (deposit || "৳0.00") + "\n" +
      "----------------------------------\n" +
      "💬 Message: " + (message || "").trim() + "\n\n" +
      "💡 উত্তর দেওয়ার উপায়:\n" +
      "১. এই মেসেজে সরাসরি Reply করুন\n" +
      "২. অথবা লিখুন: " + cleanUser + ": আপনার উত্তর";

    const tgUrl = `https://api.telegram.org/bot${SN_BOT_TOKEN}/sendMessage`;
    const response = await safeFetchJsonWithRetry(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: SN_GROUP_ID.trim(),
        text: payloadText
      })
    });

    if (response && response.ok && response.result && response.result.message_id) {
      const msgId = response.result.message_id;
      sentMessageToUserMap.set(msgId, { userId: cleanUser, username: cleanName });
      if (sentMessageToUserMap.size > 200) {
        const firstKey = sentMessageToUserMap.keys().next().value;
        if (firstKey !== undefined) sentMessageToUserMap.delete(firstKey);
      }
      console.log(`[TelegramChat] Delivered message for ${cleanUser} (TG msg_id: ${msgId})`);
    } else {
      console.error("Telegram Send Status:", response);
    }

    return res.json({ success: true, delivered: !!(response && response.ok) });
  } catch (err: any) {
    return res.json({ success: true });
  }
});

// Photo Proxy Endpoint
app.post("/api/send-telegram-photo", express.json({limit: "25mb"}), async (req, res) => {
  try {
    const { name, userId, balance, deposit, imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: "Missing image" });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const captionText = 
      "🖼️ New Image Attachment\n" +
      "🌐 Site: Sn777.site\n" +
      "👤 Name: " + (name || "User") + "\n" +
      "🆔 User ID: " + (userId || "Guest") + "\n" +
      "💰 Balance: " + (balance || "৳0.00") + "\n" +
      "💳 Total Deposit: " + (deposit || "৳0.00");

    const formData = new FormData();
    formData.append("chat_id", SN_GROUP_ID.trim());
    formData.append("photo", new Blob([buffer], { type: "image/jpeg" }), "photo.jpg");
    formData.append("caption", captionText);

    const tgUrl = `https://api.telegram.org/bot${SN_BOT_TOKEN}/sendPhoto`;
    const response = await safeFetchJsonWithRetry(tgUrl, {
      method: "POST",
      body: formData
    });

    return res.json({ success: true, delivered: !!(response && response.ok) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint for client to poll admin replies for a specific userId
app.get("/api/telegram-replies", async (req, res) => {
  try {
    const rawId = String(req.query.userId || req.query.username || "").trim();
    if (!rawId) return res.json({ success: true, replies: [] });

    const key = rawId.toLowerCase();
    const list = userRepliesStore.get(key) || userRepliesStore.get(rawId) || [];
    return res.json({ success: true, replies: list });
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
              const uName = authUser.email ? authUser.email.split("@")[0] : rawQuery;
              userData = {
                username: uName,
                email: authUser.email,
                name: authUser.displayName || uName,
                phone: authUser.phoneNumber || "",
                status: "active",
                balance: "777.00",
                totalDeposited: 0,
                registrationDate: authUser.metadata.creationTime || new Date().toISOString(),
                role: "user"
              };
              db.collection("users").doc(userUid).set(userData, { merge: true }).catch(() => {});
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
            const uName = matched.email ? matched.email.split("@")[0] : rawQuery;
            userData = {
              username: uName,
              email: matched.email,
              name: matched.displayName || uName,
              phone: matched.phoneNumber || "",
              status: "active",
              balance: "777.00",
              totalDeposited: 0,
              registrationDate: matched.metadata.creationTime || new Date().toISOString(),
              role: "user"
            };
            db.collection("users").doc(userUid).set(userData, { merge: true }).catch(() => {});
          }
        }
      } catch (e) {}
    }

    if (!userData) {
      return res.json({ success: false, error: "User not found" });
    }

    const numBal = parseFloat(String(userData.balance || "0").replace(/,/g, "")) || 0;
    const numDep = parseFloat(String(userData.totalDeposited || "0").replace(/,/g, "")) || 0;

    const cleanUName = (userData.username && userData.username !== "ব্যবহারকারী" && userData.username !== "User") ? userData.username : (userData.email ? userData.email.split("@")[0] : rawQuery);
    const cleanDisplayName = (userData.name && userData.name !== "সম্পূর্ণ নাম" && userData.name !== "ব্যবহারকারী" && userData.name !== "User") ? userData.name : cleanUName;

    return res.json({
      success: true,
      user: {
        uid: userUid,
        username: cleanUName,
        name: cleanDisplayName,
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
    const uid = req.query.uid as string;
    
    let authUser = null;
    try {
       if (uid) {
         authUser = await adminApp.auth().getUser(uid);
       } else if (username) {
         authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, '')}@sn777.com`);
       } else {
         return res.json({error: "provide username or uid"});
       }
    } catch(e: any) {
       authUser = { error: e.message };
    }
    
    // Check Firestore
    let firestoreData = null;
    if (uid) {
      const snap = await adminApp.firestore().collection("users").doc(uid).get();
      if (snap.exists) firestoreData = snap.data();
    } else if (username) {
      const snapshot = await adminApp.firestore().collection("users").where("username", "==", username).get();
      if (!snapshot.empty) firestoreData = snapshot.docs[0].data();
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


// Helper function to automatically approve deposit and credit user balance across Local Store & Firestore
async function approveAndCreditDeposit(orderNoInput: string, paidAmountOverride?: number, reqUid?: string, tradeNoParam?: string, gatewayRawData?: any) {
  const cleanOrderNo = String(orderNoInput || "").trim();
  if (!cleanOrderNo) return null;

  const localList = getLocalTransactions();
  const existingLocal = localList.find((t: any) =>
    t.id === cleanOrderNo || t.order_no === cleanOrderNo || t.depositNo === cleanOrderNo || t.serialNo === cleanOrderNo ||
    (tradeNoParam && (t.tradeNo === tradeNoParam || t.id === tradeNoParam))
  );

  let depData: any = null;
  let paidDepAmount = Number(existingLocal?.amount) || paidAmountOverride || 0;
  let bonusAmt = Number(existingLocal?.bonusAmount) || Number(existingLocal?.bonus) || Number(depData?.bonusAmount) || Number(depData?.bonus) || 0;
  let storedFinalCredit = Number(existingLocal?.finalCredit) || Number(depData?.finalCredit) || 0;
  let calcRes = getDepositFinalCredit(paidDepAmount, existingLocal?.bonusOption || depData?.bonusOption, storedFinalCredit);
  let amount = Math.max(paidAmountOverride || 0, paidDepAmount, storedFinalCredit, calcRes.finalCredit, paidDepAmount + bonusAmt);
  
  let candidateUid = !isGenericUid(reqUid) ? reqUid : "";
  if (isGenericUid(candidateUid)) {
    candidateUid = !isGenericUid(existingLocal?.uid) ? existingLocal.uid : "";
  }
  let candidateUsername = existingLocal?.username || "";
  let phone = existingLocal?.phone || existingLocal?.userPhone || "";

  // 1. Resolve from paymentOrdersCache if available
  if (isGenericUid(candidateUid)) {
    const cachedOrder = paymentOrdersCache.get(cleanOrderNo);
    if (cachedOrder && !isGenericUid(cachedOrder.uid)) {
      candidateUid = cachedOrder.uid;
      if (!candidateUsername || isGenericUid(candidateUsername)) candidateUsername = cachedOrder.username;
      if (!phone) phone = cachedOrder.phone;
    }
  }

  // 2. Resolve from gatewayRawData (mch_return_msg contains UID)
  if (isGenericUid(candidateUid) && gatewayRawData) {
    const retMsg = String(gatewayRawData.mch_return_msg || gatewayRawData.mchReturnMsg || "").trim();
    if (retMsg && !isGenericUid(retMsg) && retMsg !== "sn777_user") {
      candidateUid = retMsg;
    }
  }

  // 3. Resolve from Firestore deposit document (check defaultDb and custom db)
  const adminApp = getFirebaseAdmin();
  const defaultDb = adminApp ? adminApp.firestore() : null;
  const db = getFirestoreDb();

  if (isGenericUid(candidateUid)) {
    try {
      if (defaultDb) {
        const snap = await defaultDb.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
        if (snap && snap.exists) depData = snap.data();
      }
      if (!depData && db) {
        const depSnap = await db.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
        if (depSnap && depSnap.exists) depData = depSnap.data();
      }
      if (!depData) {
        depData = await firestoreRestGet("deposits", cleanOrderNo, "(default)");
      }
      if (!depData) {
        depData = await firestoreRestGet("deposits", cleanOrderNo, FS_DB_ID);
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
      console.warn("[approveAndCreditDeposit] Firestore deposit check skipped:", e);
    }
  }

  // Idempotency check: Has user balance ALREADY been credited for this deposit to THIS candidateUid?
  const alreadyCreditedToRealUser = (
    (existingLocal && existingLocal.balanceCredited === true && existingLocal.creditedUid && !isGenericUid(existingLocal.creditedUid) && existingLocal.creditedUid === candidateUid) ||
    (depData && depData.balanceCredited === true && depData.creditedUid && !isGenericUid(depData.creditedUid) && depData.creditedUid === candidateUid)
  );

  let targetUid = candidateUid;
  let updatedBalance = "";

  if (!alreadyCreditedToRealUser && amount > 0 && candidateUid && !isGenericUid(candidateUid)) {
    try {
      // 1. Fetch current live Firestore user data from BOTH databases first
      let uDataDefault: any = null;
      let uDataCustom: any = null;

      try {
        uDataDefault = await firestoreRestGet("users", candidateUid, "(default)");
      } catch (e) {}
      try {
        uDataCustom = await firestoreRestGet("users", candidateUid, FS_DB_ID);
      } catch (e) {}

      if (!uDataDefault && defaultDb) {
        try {
          const snap = await Promise.race([
            defaultDb.collection("users").doc(candidateUid).get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 1500))
          ]).catch(() => null);
          if (snap && snap.exists) uDataDefault = snap.data();
        } catch (e) {}
      }
      if (!uDataCustom && db) {
        try {
          const snap = await Promise.race([
            db.collection("users").doc(candidateUid).get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 1500))
          ]).catch(() => null);
          if (snap && snap.exists) uDataCustom = snap.data();
        } catch (e) {}
      }

      const extractMaxDocBal = (doc: any): number => {
        if (!doc) return 0;
        const candidates = [doc.balance, doc.userBalance, doc.mainBalance, doc.walletBalance];
        let maxV = 0;
        for (const c of candidates) {
          if (c !== undefined && c !== null && c !== "") {
            const v = parseFloat(String(c).replace(/,/g, ""));
            if (!isNaN(v) && v > maxV) maxV = v;
          }
        }
        return maxV;
      };

      const curFsBalDefault = extractMaxDocBal(uDataDefault);
      const curFsBalCustom = extractMaxDocBal(uDataCustom);
      const curLocalBal = getLocalUserBalance(candidateUid);

      // Base balance is the maximum confirmed balance across Firestore and local store (never overwrite with stale lower value)
      const existingLocalBal = extractMaxDocBal(existingLocal);
      const depDataBal = extractMaxDocBal(depData);
      const baseBal = Math.max(curLocalBal, curFsBalDefault, curFsBalCustom, existingLocalBal, depDataBal);
      const fsNewBal = (baseBal + amount).toFixed(2);
      updatedBalance = fsNewBal;

      console.log(`[DEBUG-BALANCE] User: ${candidateUid}, Base: ${baseBal}, Adding: ${amount}, New: ${fsNewBal}`);
      if (amount === 50 && baseBal > 0) {
        console.warn(`[DEBUG-BALANCE] WARNING: Adding exactly 50 BDT to user ${candidateUid}. Investigating if this is a mistake.`);
      }

      const stats = recalculateUserDepositStats(candidateUid);
      const curDep = stats.totalDeposited;
      const curCount = stats.approvedDepositsCount;

      const userUpdatePayload = {
        balance: fsNewBal,
        userBalance: fsNewBal,
        mainBalance: fsNewBal,
        approvedDepositsCount: curCount,
        totalDeposited: curDep,
        totalDeposit: curDep,
        deposit: curDep,
        withdrawEnabled: (curDep >= 940 && curCount >= 2),
        updatedAt: new Date().toISOString()
      };

      // 2. Write user update to BOTH Firestore databases simultaneously via REST & Admin SDK
      await Promise.allSettled([
        firestoreRestPatch("users", candidateUid, userUpdatePayload, "(default)"),
        firestoreRestPatch("users", candidateUid, userUpdatePayload, FS_DB_ID)
      ]);
      if (defaultDb) {
        defaultDb.collection("users").doc(candidateUid).set(userUpdatePayload, { merge: true }).catch(() => {});
      }
      if (db) {
        db.collection("users").doc(candidateUid).set(userUpdatePayload, { merge: true }).catch(() => {});
      }

      // 3. Update local store & in-memory trackers with the newly computed balance
      updateLocalUserBalance(candidateUid, fsNewBal, amount);
      if (candidateUsername && candidateUsername !== candidateUid && !isGenericUid(candidateUsername)) {
        updateLocalUserBalance(candidateUsername, fsNewBal, amount);
      }
      console.log(`[approveAndCreditDeposit] Successfully credited ৳${amount} to user ${candidateUid}. Base bal: ৳${baseBal}, New bal: ৳${fsNewBal}`);
    } catch (uErr) {
      console.error("[approveAndCreditDeposit] Error updating user balance:", uErr);
    }
  }

  const finalUid = !isGenericUid(targetUid) ? targetUid : (!isGenericUid(candidateUid) ? candidateUid : "");
  const nowIso = new Date().toISOString();

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
    tradeNo: tradeNoParam || existingLocal?.tradeNo || "",
    type: "deposit",
    createdAt: existingLocal?.createdAt || existingLocal?.timestamp || nowIso,
    timestamp: existingLocal?.timestamp || existingLocal?.createdAt || nowIso,
    updatedAt: nowIso,
    approvedAt: nowIso,
    notified: false
  };
  saveLocalTransaction(updatedLocal);

  // Sync deposit records to BOTH Firestore databases (guaranteed via Admin SDK & REST API)
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
    tradeNo: tradeNoParam || existingLocal?.tradeNo || "",
    approvedAt: nowIso,
    updatedAt: nowIso,
    ...(finalUid && { uid: finalUid })
  };

  try {
    await Promise.allSettled([
      firestoreRestPatch("deposits", cleanOrderNo, approvedPayload, "(default)"),
      firestoreRestPatch("deposits", cleanOrderNo, approvedPayload, FS_DB_ID),
      firestoreRestPatch("transactions", cleanOrderNo, approvedPayload, "(default)"),
      firestoreRestPatch("transactions", cleanOrderNo, approvedPayload, FS_DB_ID),
      finalUid ? firestoreRestPatch(`users/${finalUid}/history`, cleanOrderNo, approvedPayload, "(default)") : Promise.resolve(),
      finalUid ? firestoreRestPatch(`users/${finalUid}/history`, cleanOrderNo, approvedPayload, FS_DB_ID) : Promise.resolve()
    ]);
    if (defaultDb) {
      Promise.allSettled([
        defaultDb.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        defaultDb.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        finalUid ? defaultDb.collection("users").doc(finalUid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }) : Promise.resolve()
      ]).catch(() => {});
    }
    if (db) {
      Promise.allSettled([
        db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        finalUid ? db.collection("users").doc(finalUid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }) : Promise.resolve()
      ]).catch(() => {});
    }
    console.log(`[approveAndCreditDeposit] Deposit ${cleanOrderNo} successfully marked approved across (default) and custom Firestore!`);
  } catch (syncErr) {
    console.warn("[approveAndCreditDeposit] Firestore sync error:", syncErr);
  }

  return updatedLocal;
}

// Background reconciler to automatically credit any past approved deposits that haven't been credited to user balance yet
async function reconcileUncreditedApprovedDeposits() {
  try {
    const localList = getLocalTransactions();
    const approvedUncredited = localList.filter((t: any) =>
      t.type === "deposit" && (t.status === "approved" || t.credited === true) &&
      (t.balanceCredited !== true || isGenericUid(t.creditedUid) || isGenericUid(t.uid))
    );
    if (approvedUncredited.length > 0) {
      console.log(`[Reconciler] Found ${approvedUncredited.length} approved deposits needing balance credit or UID fix. Reconciling...`);
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
            console.log(`[Reconciler] Found Firestore deposit #${doc.id} approved but needing balance credit. Reconciling...`);
            await approveAndCreditDeposit(doc.id, Number(d.amount || d.finalCredit || 0), !isGenericUid(d.uid) ? d.uid : "");
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[Reconciler] Error during deposit reconciliation:", err?.message || err);
  }
}

// ==========================================
// AUTOMATED SMS VERIFICATION & DEPOSIT MATCHING ENGINE
// ==========================================
async function handleIncomingSmsPayload(payload: any) {
  const settings = getSmsSettings();
  if (!settings.enabled) {
    return { success: false, status: "disabled", message: "এসএমএস অটো-ভেরিফিকেশন সার্ভিস সাময়িকভাবে বন্ধ আছে।" };
  }

  const secret = payload.secret || payload.token || payload.apiKey || payload.key || "";
  if (settings.secretKey && secret && secret !== settings.secretKey) {
    return { success: false, status: "unauthorized", message: "ভুল সিক্রেট কি (Invalid Secret Key)!" };
  }

  let rawMessage = String(payload.message || payload.body || payload.text || payload.msg || payload.sms || payload.content || "").trim();
  let senderHint = String(payload.sender || payload.from || payload.address || payload.provider || "").trim();

  if (!rawMessage && typeof payload === "string") {
    rawMessage = payload.trim();
  }

  // Parse SMS using intelligent Bangladeshi MFS Parser
  let parsed = parseSms(rawMessage, senderHint);

  // If direct fields were supplied
  if ((!parsed || !parsed.trxId) && (payload.trxId || payload.transactionId || payload.order_no)) {
    const directTrx = String(payload.trxId || payload.transactionId || payload.order_no || "").trim().toUpperCase();
    const directAmt = parseFloat(String(payload.amount || payload.money || "0").replace(/,/g, ""));
    if (directTrx) {
      parsed = {
        provider: (payload.provider as any) || parsed?.provider || "unknown",
        trxId: directTrx,
        amount: directAmt > 0 ? directAmt : (parsed?.amount || null),
        senderPhone: payload.senderPhone || payload.phone || parsed?.senderPhone || null,
        raw: rawMessage || `Direct: TrxID ${directTrx} Amount ৳${directAmt}`,
        senderHint: senderHint,
        detectedAt: new Date().toISOString()
      };
    }
  }

  if (!parsed || !parsed.trxId || !parsed.amount) {
    const logItem: SmsLog = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage || JSON.stringify(payload),
      sender: senderHint,
      provider: parsed?.provider || "unknown",
      trxId: parsed?.trxId || null,
      amount: parsed?.amount || null,
      senderPhone: parsed?.senderPhone || null,
      receivedAt: new Date().toISOString(),
      matched: false,
      autoApproved: false,
      status: "unparsed",
      note: "এসএমএস থেকে TrxID অথবা টাকার পরিমাণ শনাক্ত করা যায়নি।"
    };
    saveSmsLog(logItem);
    return {
      success: false,
      status: "unparsed",
      message: "এসএমএস থেকে TrxID অথবা টাকার পরিমাণ শনাক্ত করা যায়নি। অনুগ্রহ করে সঠিক বিকাশ/নগদ/রকেট মেসেজ দিন।",
      parsed
    };
  }

  const cleanTrxId = parsed.trxId.toUpperCase().trim();
  const paidAmount = parsed.amount;

  // Check if this TrxID was already approved/credited
  const localList = getLocalTransactions();
  const alreadyApproved = localList.find((t: any) =>
    (String(t.transactionId || "").toUpperCase() === cleanTrxId || String(t.order_no || "").toUpperCase() === cleanTrxId) &&
    (t.status === "approved" || t.credited === true)
  );

  if (alreadyApproved) {
    const logItem: SmsLog = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage,
      sender: senderHint,
      provider: parsed.provider,
      trxId: cleanTrxId,
      amount: paidAmount,
      senderPhone: parsed.senderPhone,
      receivedAt: new Date().toISOString(),
      matched: true,
      matchedOrderNo: alreadyApproved.order_no || alreadyApproved.id,
      matchedUid: alreadyApproved.uid,
      autoApproved: false,
      status: "already_used",
      note: "এই TrxID ইতিমধ্যেই অনুমোদিত হয়েছে এবং একাউন্টে ব্যালেন্স যোগ হয়েছে।"
    };
    saveSmsLog(logItem);
    return {
      success: true,
      status: "already_used",
      message: "এই ট্রানজ্যাকশন আইডি ইতিমধ্যেই ব্যবহৃত ও অনুমোদিত হয়েছে।",
      trxId: cleanTrxId,
      amount: paidAmount,
      order_no: alreadyApproved.order_no || alreadyApproved.id
    };
  }

  // 1. Check if user already submitted a pending deposit
  let pendingTx = localList.find((t: any) =>
    (t.status === "pending" || t.status === "processing") &&
    (String(t.transactionId || "").toUpperCase() === cleanTrxId ||
     String(t.order_no || "").toUpperCase() === cleanTrxId ||
     String(t.id || "").toUpperCase() === cleanTrxId)
  );

  // 2. Query Firestore deposits if not in local store
  if (!pendingTx) {
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        const snap = await Promise.race([
          db.collection("deposits")
            .where("transactionId", "==", cleanTrxId)
            .where("status", "==", "pending")
            .limit(1)
            .get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);

        if (snap && !snap.empty) {
          pendingTx = snap.docs[0].data();
        }
      }
    } catch (dbErr) {
      console.warn("[handleIncomingSmsPayload] Firestore query warning:", dbErr);
    }
  }

  // MATCH FOUND: Auto-Approve user deposit instantly!
  if (pendingTx && settings.autoApprove) {
    const targetOrderNo = pendingTx.order_no || pendingTx.id;
    const uid = pendingTx.uid;

    await approveAndCreditDeposit(targetOrderNo, paidAmount, uid);

    addToVerifiedPool({
      trxId: cleanTrxId,
      amount: paidAmount,
      provider: parsed.provider,
      senderPhone: parsed.senderPhone,
      rawText: rawMessage,
      receivedAt: new Date().toISOString()
    });
    claimPoolSms(cleanTrxId, targetOrderNo, uid);

    const logItem: SmsLog = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage,
      sender: senderHint,
      provider: parsed.provider,
      trxId: cleanTrxId,
      amount: paidAmount,
      senderPhone: parsed.senderPhone,
      receivedAt: new Date().toISOString(),
      matched: true,
      matchedOrderNo: targetOrderNo,
      matchedUid: uid,
      autoApproved: true,
      status: "auto_approved",
      note: `অপেক্ষমান ডিপোজিট #${targetOrderNo} (${pendingTx.username || uid}) এর সাথে মিলে গেছে এবং তাৎক্ষণিক ৳${paidAmount} ক্রেডিট করা হয়েছে!`
    };
    saveSmsLog(logItem);

    return {
      success: true,
      status: "auto_approved",
      matched: true,
      autoApproved: true,
      order_no: targetOrderNo,
      amount: paidAmount,
      username: pendingTx.username,
      message: `ডিপোজিট #${targetOrderNo} সফলভাবে ভেরিফাই ও ইউজার (${pendingTx.username || "User"}) একাউন্টে ৳${paidAmount} যোগ করা হয়েছে!`
    };
  }

  // NO PENDING DEPOSIT YET: Store in verified pool
  addToVerifiedPool({
    trxId: cleanTrxId,
    amount: paidAmount,
    provider: parsed.provider,
    senderPhone: parsed.senderPhone,
    rawText: rawMessage,
    receivedAt: new Date().toISOString()
  });

  const logItem: SmsLog = {
    id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    rawText: rawMessage,
    sender: senderHint,
    provider: parsed.provider,
    trxId: cleanTrxId,
    amount: paidAmount,
    senderPhone: parsed.senderPhone,
    receivedAt: new Date().toISOString(),
    matched: false,
    autoApproved: false,
    status: "waiting_for_user",
    note: `ভেরিফাইড পুলে জমা রাখা হয়েছে। ইউজার এই TrxID (${cleanTrxId}) সাবমিট করলেই তাৎক্ষণিক স্বয়ংক্রিয়ভাবে ক্রেডিট হবে।`
  };
  saveSmsLog(logItem);

  return {
    success: true,
    status: "waiting_for_user",
    matched: false,
    inPool: true,
    trxId: cleanTrxId,
    amount: paidAmount,
    provider: parsed.provider,
    message: `এসএমএস সফলভাবে গৃহীত হয়েছে (TrxID: ${cleanTrxId}, টাকা: ৳${paidAmount})। ইউজার সাবমিট করলেই ৫ সেকেন্ডের মধ্যে অটো-ক্রেডিট হবে।`
  };
}

// SMS Webhook Routes (Supports POST & GET from Android SMS Forwarders)
app.post(["/api/sms/webhook", "/api/sms/incoming"], async (req, res) => {
  try {
    const payload = { ...req.query, ...(typeof req.body === "object" ? req.body : { message: req.body }) };
    const result = await handleIncomingSmsPayload(payload);
    return res.json(result);
  } catch (err: any) {
    console.error("SMS Webhook POST error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get(["/api/sms/webhook", "/api/sms/incoming"], async (req, res) => {
  try {
    const payload = req.query;
    const result = await handleIncomingSmsPayload(payload);
    return res.json(result);
  } catch (err: any) {
    console.error("SMS Webhook GET error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin SMS Test Endpoint (Manual Paste & Auto-Approve)
app.post("/api/admin/sms-test", async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: "মেসেজ লিখুন বা পেস্ট করুন।" });
    }
    const result = await handleIncomingSmsPayload({ message, sender: sender || "bKash" });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin SMS Logs & Pool Endpoint
app.get("/api/admin/sms-logs", (req, res) => {
  const logs = getSmsLogs();
  const pool = getVerifiedSmsPool();
  const settings = getSmsSettings();
  res.json({
    success: true,
    settings,
    poolCount: pool.filter((x) => !x.claimed).length,
    totalLogs: logs.length,
    logs: logs.slice(0, 100),
    pool: pool.slice(0, 50)
  });
});

// Admin SMS Settings Update
app.post("/api/admin/sms-settings", (req, res) => {
  const updated = saveSmsSettings(req.body);
  res.json({ success: true, settings: updated, message: "এসএমএস সেটিংস সংরক্ষিত হয়েছে।" });
});

// Admin SMS Instructions & Configuration
app.get("/api/admin/sms-instructions", (req, res) => {
  const settings = getSmsSettings();
  const host = req.get("host") || "sn777.site";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/sms/webhook?secret=${settings.secretKey}`;

  res.json({
    success: true,
    webhookUrl,
    method: "POST or GET",
    supportedApps: [
      { name: "SMS Forwarder", playStoreUrl: "https://play.google.com/store/apps/details?id=com.lanrenshen.smsforwarder" },
      { name: "MacroDroid", playStoreUrl: "https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid" },
      { name: "Tasker", playStoreUrl: "https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm" }
    ],
    supportedFilters: ["bKash", "16247", "Nagad", "16167", "Rocket", "16216", "Upay"],
    sampleFormat: {
      postJson: { sender: "bKash", message: "You have received Tk 500.00 from 017xxxxxxxx. Ref . Fee Tk 0.00. Balance Tk 15,200.00. TrxID 9K38LS92 at 15/09/2026 21:05" },
      getQuery: `${webhookUrl}&sender=%from&message=%body`
    }
  });
});

// Dedicated HTML Web Dashboard for SMS Automation
app.get(["/admin/sms", "/sms-admin"], (req, res) => {
  const settings = getSmsSettings();
  const host = req.get("host") || "sn777.site";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/sms/webhook?secret=${settings.secretKey}`;

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SN777 - অটোমেটিক এসএমএস ডিপোজিট ভেরিফিকেশন</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0b1120; font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; }
    .glass-card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border-radius: 1rem; }
  </style>
</head>
<body class="min-h-screen p-3 md:p-6 pb-20">
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
          <i class="fa-solid fa-mobile-screen-button"></i>
        </div>
        <div>
          <h1 class="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            অটো এসএমএস ডিপোজিট ভেরিফিকেশন
            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">সচল</span>
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">পার্সোনাল বিকাশ, নগদ ও রকেটে এসএমএস আসলে ইনস্ট্যান্ট অটো ভেরিফাই</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="/" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2">
          <i class="fa-solid fa-arrow-left"></i> গেমে ফিরুন
        </a>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-slate-400 font-bold block mb-1">মোট প্রাপ্ত SMS</span>
        <span id="stat-total" class="text-2xl md:text-3xl font-black text-white">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-emerald-400 font-bold block mb-1">অটো-অ্যাপ্রুভড</span>
        <span id="stat-approved" class="text-2xl md:text-3xl font-black text-emerald-400">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-cyan-400 font-bold block mb-1">পুলে অপেক্ষমান</span>
        <span id="stat-pool" class="text-2xl md:text-3xl font-black text-cyan-400">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-amber-400 font-bold block mb-1">অটো মোড</span>
        <span id="stat-mode" class="text-sm md:text-base font-black text-amber-400">চালু (ON)</span>
      </div>
    </div>

    <!-- Webhook URL & Android Setup -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-link text-emerald-400"></i> আপনার এসএমএস ওয়েবহুক ইউআরএল (Webhook URL)
        </h2>
        <span class="text-xs text-slate-400">ফোনের অ্যাপে এই লিঙ্ক দিন</span>
      </div>
      <div class="flex flex-col md:flex-row gap-2">
        <input id="webhook-url-input" type="text" readonly value="${webhookUrl}" class="flex-1 bg-slate-900 border border-slate-700 text-emerald-400 px-4 py-3 rounded-xl font-mono text-xs md:text-sm font-bold select-all focus:outline-none focus:border-emerald-500">
        <button onclick="copyWebhookUrl()" id="copy-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs md:text-sm px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
          <i class="fa-solid fa-copy"></i> কপি করুন
        </button>
      </div>
      <div class="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
        <p class="text-slate-300 font-bold"><i class="fa-solid fa-circle-info text-cyan-400 mr-1"></i> কীভাবে পার্সোনাল সিমে অটো এসএমএস সেটআপ করবেন:</p>
        <p>১. আপনার যে ফোনে বিকাশ/নগদ সিমটি আছে, সেই ফোনে প্লে-স্টোর থেকে <b>"SMS Forwarder"</b> অথবা <b>"MacroDroid"</b> অ্যাপ ইন্সটল করুন।</p>
        <p>২. অ্যাপে ফরওয়ার্ড অপশনে <b>Webhook (HTTP POST/GET)</b> সিলেক্ট করে উপরের ইউআরএলটি পেস্ট করুন।</p>
        <p>৩. ফিল্টারে প্রেরক নাম দিন: <b>bKash, Nagad, 16247, 16167, Rocket</b>।</p>
        <p>৪. ব্যস! এখন থেকে পার্সোনাল নাম্বারে টাকা আসামাত্রই ফোন স্বয়ংক্রিয়ভাবে মেসেজ পাঠিয়ে ইউজারের একাউন্টে ব্যালেন্স যোগ করে দেবে।</p>
      </div>
    </div>

    <!-- Manual SMS Quick Paste Test -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-400"></i> ম্যানুয়ালি SMS পেস্ট করে তাৎক্ষণিক অটো-অ্যাপ্রুভ
        </h2>
        <span class="text-xs text-slate-400">ফোন থেকে মেসেজ কপি করে এখানে দিন</span>
      </div>
      <div class="space-y-3">
        <textarea id="manual-sms-text" rows="3" placeholder="উদাহরণ: You have received Tk 500.00 from 017xxxxxxxx. Ref . Fee Tk 0.00. Balance Tk 15,200.00. TrxID 9K38LS92 at 16/09/2026..." class="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-xs md:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono"></textarea>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-bold">প্রোভাইডার:</span>
            <select id="manual-sender-select" class="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none">
              <option value="bKash">bKash (বিকাশ)</option>
              <option value="Nagad">Nagad (নগদ)</option>
              <option value="Rocket">Rocket (রকেট)</option>
              <option value="Upay">Upay (উপায়)</option>
            </select>
          </div>
          <button onclick="testManualSms()" id="test-btn" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <i class="fa-solid fa-check-double"></i> যাচাই ও অটো-অ্যাপ্রুভ করুন
          </button>
        </div>
      </div>
      <div id="test-result-box" class="hidden p-3 rounded-xl text-xs border font-mono"></div>
    </div>

    <!-- Live SMS Logs Feed -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-list-check text-cyan-400"></i> লাইভ এসএমএস হিস্ট্রি ও ট্র্যাকিং
        </h2>
        <button onclick="loadLogs()" class="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold">
          <i class="fa-solid fa-arrows-rotate"></i> রিফ্রেশ
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th class="py-2.5 px-3">সময়</th>
              <th class="py-2.5 px-3">প্রোভাইডার</th>
              <th class="py-2.5 px-3">TrxID</th>
              <th class="py-2.5 px-3">টাকার পরিমাণ</th>
              <th class="py-2.5 px-3">প্রেরক ফোন</th>
              <th class="py-2.5 px-3">স্ট্যাটাস</th>
              <th class="py-2.5 px-3">অর্ডার / ইউজার</th>
            </tr>
          </thead>
          <tbody id="logs-table-body" class="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td colspan="7" class="py-6 text-center text-slate-500">ডাটা লোড হচ্ছে...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    function copyWebhookUrl() {
      const input = document.getElementById("webhook-url-input");
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById("copy-btn");
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> কপি হয়েছে!';
      btn.classList.replace("bg-emerald-600", "bg-green-600");
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.replace("bg-green-600", "bg-emerald-600");
      }, 2000);
    }

    async function loadLogs() {
      try {
        const res = await fetch("/api/admin/sms-logs");
        const data = await res.json();
        if (!data.success) return;

        // Stats
        document.getElementById("stat-total").textContent = data.totalLogs || 0;
        document.getElementById("stat-pool").textContent = data.poolCount || 0;
        
        const autoApprovedCount = (data.logs || []).filter(x => x.status === "auto_approved").length;
        document.getElementById("stat-approved").textContent = autoApprovedCount;

        const tbody = document.getElementById("logs-table-body");
        if (!data.logs || data.logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-500">এখনো কোনো এসএমএস পাওয়া যায়নি। উপরে ম্যানুয়ালি পেস্ট করে টেস্ট করুন অথবা ফোনে ফরোয়ার্ডার সেট করুন।</td></tr>';
          return;
        }

        tbody.innerHTML = data.logs.map(log => {
          let badge = '';
          if (log.status === 'auto_approved') {
            badge = '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">✓ অটো-অ্যাপ্রুভড</span>';
          } else if (log.status === 'waiting_for_user') {
            badge = '<span class="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">⏳ পুলে জমা</span>';
          } else if (log.status === 'already_used') {
            badge = '<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">ইতিমধ্যে ব্যবহৃত</span>';
          } else {
            badge = '<span class="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">আনপার্সড</span>';
          }

          const providerColor = log.provider === 'bkash' ? 'text-pink-400' : (log.provider === 'nagad' ? 'text-amber-400' : 'text-purple-400');
          const timeStr = log.receivedAt ? new Date(log.receivedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

          return \`<tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-2.5 px-3 text-slate-400 text-[11px]">\${timeStr}</td>
            <td class="py-2.5 px-3 font-bold uppercase \${providerColor}">\${log.provider || 'bKash'}</td>
            <td class="py-2.5 px-3 text-white font-bold">\${log.trxId || '-'}</td>
            <td class="py-2.5 px-3 text-emerald-400 font-bold">\${log.amount ? '৳ ' + log.amount : '-'}</td>
            <td class="py-2.5 px-3 text-slate-300">\${log.senderPhone || '-'}</td>
            <td class="py-2.5 px-3">\${badge}</td>
            <td class="py-2.5 px-3 text-slate-300 text-[11px]">\${log.matchedOrderNo ? '#' + log.matchedOrderNo : (log.note || '-')}</td>
          </tr>\`;
        }).join('');
      } catch (e) {
        console.error("Error fetching SMS logs:", e);
      }
    }

    async function testManualSms() {
      const text = document.getElementById("manual-sms-text").value.trim();
      const sender = document.getElementById("manual-sender-select").value;
      const resultBox = document.getElementById("test-result-box");
      const btn = document.getElementById("test-btn");

      if (!text) {
        alert("দয়া করে মেসেজের টেক্সট লিখুন বা পেস্ট করুন।");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> যাচাই হচ্ছে...';

      try {
        const res = await fetch("/api/admin/sms-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sender: sender })
        });
        const data = await res.json();

        resultBox.classList.remove("hidden", "bg-emerald-950/60", "border-emerald-500/40", "text-emerald-300", "bg-red-950/60", "border-red-500/40", "text-red-300", "bg-cyan-950/60", "border-cyan-500/40", "text-cyan-300");

        if (data.status === "auto_approved") {
          resultBox.classList.add("bg-emerald-950/60", "border-emerald-500/40", "text-emerald-300");
          resultBox.innerHTML = \`<p class="font-bold text-sm">✓ সফলভাবে অটো-অ্যাপ্রুভ হয়েছে!</p>
            <p class="mt-1">অর্ডার নং: #\${data.order_no} | ইউজার: \${data.username || 'User'} | টাকার পরিমাণ: ৳\${data.amount}</p>\`;
        } else if (data.status === "waiting_for_user") {
          resultBox.classList.add("bg-cyan-950/60", "border-cyan-500/40", "text-cyan-300");
          resultBox.innerHTML = \`<p class="font-bold text-sm">ℹ এসএমএস ভেরিফাইড পুলে জমা হয়েছে!</p>
            <p class="mt-1">TrxID: <b>\${data.trxId}</b> | টাকা: <b>৳\${data.amount}</b></p>
            <p class="text-slate-400 mt-1">ইউজার এই TrxID দিয়ে সাবমিট করলেই তার ব্যালেন্স সাথে সাথে যোগ হবে।</p>\`;
        } else {
          resultBox.classList.add("bg-amber-950/60", "border-amber-500/40", "text-amber-300");
          resultBox.innerHTML = \`<p class="font-bold">\${data.message || 'মেসেজ প্রসেস হয়েছে'}</p>\`;
        }

        loadLogs();
      } catch (err) {
        resultBox.classList.remove("hidden");
        resultBox.classList.add("bg-red-950/60", "border-red-500/40", "text-red-300");
        resultBox.textContent = "ত্রুটি: " + err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> যাচাই ও অটো-অ্যাপ্রুভ করুন';
      }
    }

    // Initial load & Polling
    loadLogs();
    setInterval(loadLogs, 5000);
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Verify Payment Endpoint
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { order_no, transactionId } = req.body;
    if (!order_no && !transactionId) {
      return res.status(400).json({ error: "Missing order_no or transactionId", success: false, status: "failed" });
    }
    const cleanOrderNo = String(order_no || transactionId).trim();
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch(e) {}

    let depositData: any = null;
    const localList = getLocalTransactions();
    const localItem = localList.find((x: any) => (
      x.order_no === cleanOrderNo ||
      x.id === cleanOrderNo ||
      x.depositNo === cleanOrderNo ||
      (transactionId && x.transactionId && String(x.transactionId).toUpperCase() === String(transactionId).toUpperCase())
    ));
    if (localItem) {
      depositData = { ...localItem };
    }

    if (db && (!depositData || depositData.status !== "approved") && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        // 1. Direct get
        let dSnap = await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);

        if (dSnap && dSnap.exists) {
          depositData = { ...depositData, ...dSnap.data() };
        } else {
          // 2. Query by order_no field
          let qSnap = await Promise.race([
            db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
          ]).catch(() => null);

          if (qSnap && !qSnap.empty) {
            depositData = { ...depositData, ...qSnap.docs[0].data() };
          } else if (transactionId) {
            let tSnap = await Promise.race([
              db.collection("deposits").where("transactionId", "==", transactionId).limit(1).get(),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
            ]).catch(() => null);

            if (tSnap && !tSnap.empty) {
              depositData = { ...depositData, ...tSnap.docs[0].data() };
            }
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

    let isApproved = depositData.status === "approved" || depositData.status === "success" || depositData.credited === true;

    // Automatic Verification Check: If pending, check if a verified SMS is waiting in the pool!
    if (!isApproved) {
      const candidateTrxId = String(depositData.transactionId || depositData.order_no || cleanOrderNo || "").toUpperCase().trim();
      const matchedSms = findMatchingSmsInPool(candidateTrxId, depositData.amount);
      if (matchedSms && !matchedSms.claimed) {
        console.log(`[verify-payment] Found matching verified SMS in pool for TrxID: ${candidateTrxId}! Auto-approving immediately!`);
        await approveAndCreditDeposit(cleanOrderNo, matchedSms.amount || depositData.amount, depositData.uid);
        claimPoolSms(candidateTrxId, cleanOrderNo, depositData.uid);

        const refreshedList = getLocalTransactions();
        const refreshedItem = refreshedList.find((x: any) => (x.order_no === cleanOrderNo || x.id === cleanOrderNo));
        if (refreshedItem) depositData = { ...depositData, ...refreshedItem };
        isApproved = true;
      }
    }

    // Guarantee that if deposit is approved, user balance is credited!
    if (isApproved && depositData && depositData.balanceCredited !== true) {
      console.log(`[verify-payment] Deposit #${cleanOrderNo} is approved but balance was not credited. Crediting now...`);
      const creditRes = await approveAndCreditDeposit(cleanOrderNo, Number(depositData.amount || depositData.finalCredit || 0), depositData.uid);
      if (creditRes) depositData = { ...depositData, ...creditRes };
    }

    const isPending = !isApproved && (depositData.status === "pending" || depositData.status === "processing");
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
    if (db && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        const querySnap = await Promise.race([
          db.collection("deposits")
            .where("transactionId", "==", cleanTxId)
            .limit(10)
            .get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);

        if (querySnap && !querySnap.empty) {
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
        }

        const queryOrderSnap = await Promise.race([
          db.collection("deposits")
            .where("order_no", "==", cleanTxId)
            .limit(10)
            .get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);

        if (queryOrderSnap && !queryOrderSnap.empty) {
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

    const matchedSms = findMatchingSmsInPool(cleanTxId);
    return res.json({
      success: true,
      autoMatchReady: !!matchedSms,
      smsAmount: matchedSms ? matchedSms.amount : null,
      message: matchedSms
        ? `এসএমএস পাওয়া গেছে (৳${matchedSms.amount})! সাবমিট করলেই তাৎক্ষণিক ব্যালেন্স যোগ হবে।`
        : "ট্রানজ্যাকশন আইডি বৈধ এবং গ্রহণ করা হয়েছে।"
    });
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

    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    
    let requestedAmount = Number(amount) || (existing && Number(existing.amount)) || 0;
    let finalCredit = Number(reqFinalCredit) || requestedAmount;
    let uid = reqUid || (existing && existing.uid) || "";
    let username = reqUsername || (existing && (existing.username || existing.accountHolder)) || "";

    if (existing) {
      if (existing.status === "approved" && existing.credited === true) {
        return res.json({ success: true, message: "এই ট্রানজ্যাকশনটি ইতিমধ্যেই অ্যাপ্রুভ করা রয়েছে।", amount: requestedAmount, finalCredit: finalCredit });
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

        const batchTasks: Promise<any>[] = [
          db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
          db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true })
        ];

        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true })
          );
        }

        // Credit user balance concurrently
        if (uid && finalCredit > 0) {
          const userRef = db.collection("users").doc(uid);
          batchTasks.push(
            (async () => {
              const userSnap = await userRef.get().catch(() => null);
              if (userSnap && userSnap.exists) {
                const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
                const newBal = (curBal + finalCredit).toFixed(2);
                await userRef.set({ balance: newBal, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
              }
            })()
          );
        }

        await Promise.allSettled(batchTasks);
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

    const wasCredited = existing && (existing.status === "approved" || existing.credited === true);
    const creditedAmount = wasCredited ? Number(existing.finalCredit || existing.amount || 0) : 0;

    // Save locally immediately as rejected/cancelled
    saveLocalTransaction({
      ...(existing || {}),
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      status: "rejected",
      cancelled: true,
      credited: false,
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
        let depData: any = null;
        if (!uid) {
          const depDoc = await db.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
          if (depDoc && depDoc.exists) {
            depData = depDoc.data();
            uid = depData.uid;
          }
        }

        const rejectPayload = {
          status: "rejected",
          cancelled: true,
          credited: false,
          rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          ...(uid && { uid }),
          ...(doc_id && { doc_id })
        };

        const batchTasks: Promise<any>[] = [
          db.collection("deposits").doc(cleanOrderNo).set(rejectPayload, { merge: true }),
          db.collection("transactions").doc(cleanOrderNo).set(rejectPayload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(rejectPayload, { merge: true })
          );

          // If this deposit was previously approved/credited, revert the user balance and deposit stats
          if (wasCredited && creditedAmount > 0) {
            const userRef = db.collection("users").doc(uid);
            batchTasks.push(
              (async () => {
                const userSnap = await userRef.get().catch(() => null);
                if (userSnap && userSnap.exists) {
                  const uData = userSnap.data() || {};
                  const curBal = parseFloat(String(uData.balance || "0").replace(/,/g, "")) || 0;
                  const newBal = Math.max(0, curBal - creditedAmount).toFixed(2);
                  const curTotalDep = Number(uData.totalDeposited || 0);
                  const newTotalDep = Math.max(0, curTotalDep - Number(existing.amount || creditedAmount));
                  const curDepCount = Number(uData.approvedDepositsCount || 0);
                  const newDepCount = Math.max(0, curDepCount - 1);
                  await userRef.set({
                    balance: newBal,
                    totalDeposited: newTotalDep,
                    approvedDepositsCount: newDepCount,
                    updatedAt: new Date().toISOString()
                  }, { merge: true }).catch(() => {});
                }
              })()
            );
          }
        }
        await Promise.allSettled(batchTasks);
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
        const batchTasks: Promise<any>[] = [
          db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }),
          db.collection("transactions").doc(cleanId).set(payload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true })
          );
        }
        await Promise.allSettled(batchTasks);
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
        const payload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "উইথড্র বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে",
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          description: "আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।"
        };
        const batchTasks: Promise<any>[] = [
          db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }),
          db.collection("transactions").doc(cleanId).set(payload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true })
          );
        }
        if (uid && refundAmount > 0) {
          const userRef = db.collection("users").doc(uid);
          batchTasks.push(
            (async () => {
              const userSnap = await userRef.get().catch(() => null);
              if (userSnap && userSnap.exists) {
                const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
                const newBal = (curBal + refundAmount).toFixed(2);
                await userRef.set({ balance: newBal, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
              }
            })()
          );
        }
        await Promise.allSettled(batchTasks);
      } catch (e) {}
    })();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
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
    const processedOrders = new Set<string>();

    // 1. Process Local Transactions
    try {
      const localList = getLocalTransactions();
      for (const t of localList) {
        if (t.uid === uid && t.type === "deposit") {
          const orderKey = String(t.order_no || t.id || "");
          // If pending, check if a matching SMS arrived in verified pool (Manual deposits ONLY, NOT GoPay gateway)
          if ((t.status === "pending" || t.status === "processing") && t.gateway !== "gopay") {
            const candTrx = String(t.transactionId || "").trim().toUpperCase();
            if (candTrx && !candTrx.startsWith("ORD") && candTrx.length >= 6) {
              const matched = findMatchingSmsInPool(candTrx, t.amount);
              if (matched && !matched.claimed) {
                console.log(`[auto-check-user-deposits] Found matching SMS in pool for ${candTrx}! Auto-approving manual deposit #${orderKey}!`);
                await approveAndCreditDeposit(orderKey, matched.amount || t.amount, uid);
                claimPoolSms(candTrx, orderKey, uid);
                t.status = "approved";
                t.credited = true;
                t.notified = false;
              }
            }
          }

          // If approved, check if balance was credited
          if ((t.status === "approved" || t.credited === true) && t.type === "deposit") {
            if (t.balanceCredited !== true) {
              await approveAndCreditDeposit(orderKey, Number(t.amount || t.finalCredit || 0), uid);
            }
            if (!processedOrders.has(orderKey)) {
              processedOrders.add(orderKey);
              const isUnnotified = t.notified === false || (t.notified !== true && t.notified !== "true");
              if (isUnnotified) {
                t.notified = true;
                saveLocalTransaction(t);
                results.push({
                  order_no: orderKey,
                  result: {
                    success: true,
                    status: "approved",
                    amount: Number(t.amount || 0),
                    finalCredit: Number(t.finalCredit || t.amount || 0)
                  }
                });
              }
            }
          }
        }
      }
    } catch (localErr) {
      console.warn("[auto-check-user-deposits] Local check error:", localErr);
    }

    let userDocData: any = null;

    // 2. Process Firestore Deposits if connected
    if (db && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        const uSnap = await Promise.race([
          db.collection("users").doc(uid).get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (uSnap && uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {}

      try {
        const depSnap = await Promise.race([
          db.collection("deposits").where("uid", "==", uid).limit(10).get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);

        if (depSnap && !depSnap.empty) {
          for (const doc of depSnap.docs) {
            const parsed = doc.data();
            const order_no = doc.id;

            // If pending in Firestore, check if matching SMS is in pool (Manual deposits ONLY, NOT GoPay gateway)
            if ((parsed.status === "pending" || parsed.status === "processing") && parsed.gateway !== "gopay") {
              const candTrx = String(parsed.transactionId || "").trim().toUpperCase();
              if (candTrx && !candTrx.startsWith("ORD") && candTrx.length >= 6) {
                const matched = findMatchingSmsInPool(candTrx, parsed.amount);
                if (matched && !matched.claimed) {
                  console.log(`[auto-check-user-deposits] Firestore matching SMS in pool for ${candTrx}! Auto-approving manual deposit #${order_no}!`);
                  await approveAndCreditDeposit(order_no, matched.amount || parsed.amount, uid);
                  claimPoolSms(candTrx, order_no, uid);
                  parsed.status = "approved";
                  parsed.notified = false;
                }
              }
            }

            const isApproved = parsed.status === "approved" || parsed.status === "success" || parsed.credited === true;
            if (isApproved && parsed.balanceCredited !== true) {
              await approveAndCreditDeposit(order_no, Number(parsed.amount || parsed.finalCredit || 0), uid);
            }

            const isUnnotified = parsed.notified === false || (parsed.notified !== true && parsed.notified !== "true");

            if (isApproved && isUnnotified && !processedOrders.has(order_no)) {
              processedOrders.add(order_no);
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
              doc.ref.update({ notified: true }).catch(() => {});
            }
          }
        }

        // Re-fetch fresh user doc data after possible credits
        const freshSnap = await Promise.race([
          db.collection("users").doc(uid).get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (freshSnap && freshSnap.exists) userDocData = freshSnap.data();
      } catch (err: any) {}
    }

    if (!userDocData) {
      try {
        const restUser = await firestoreRestGet("users", uid);
        if (restUser && (restUser.balance !== undefined || restUser.username)) {
          userDocData = restUser;
        }
      } catch (e) {}
    }

    if (!userDocData) {
      const store = getLocalUsersStore();
      const localUser = store[uid] || store[uid.toLowerCase()];
      if (localUser) {
        userDocData = {
          uid,
          balance: String(localUser.balance || getLocalUserBalance(uid).toFixed(2)),
          totalDeposited: localUser.totalDeposited || 0,
          approvedDepositsCount: localUser.approvedDepositsCount || 0,
          username: localUser.username || "User"
        };
      } else {
        const bal = getLocalUserBalance(uid);
        userDocData = {
          uid,
          balance: bal.toFixed(2),
          totalDeposited: 0,
          approvedDepositsCount: 0,
          username: "User"
        };
      }
    }

    const accurateStats = recalculateUserDepositStats(uid);
    if (!userDocData) userDocData = {};
    userDocData.totalDeposited = accurateStats.totalDeposited;
    userDocData.approvedDepositsCount = accurateStats.approvedDepositsCount;

    const localStoreCheck = getLocalUsersStore();
    const activeLocal = localStoreCheck[uid] || localStoreCheck[uid.toLowerCase()] || (userDocData?.username && localStoreCheck[userDocData.username]);
    if (activeLocal && activeLocal.balance !== undefined) {
      const numLocal = parseFloat(String(activeLocal.balance).replace(/,/g, "")) || 0;
      const numFs = parseFloat(String(userDocData.balance || "0").replace(/,/g, "")) || 0;
      if (numLocal > numFs) {
        userDocData.balance = activeLocal.balance;
      }
    }

    return res.json({ success: true, results, user: userDocData });
  } catch (e: any) {
    return res.json({ success: true, results: [], user: null });
  }
});

// Endpoint to dismiss deposit notification so user is only notified once
app.post("/api/dismiss-deposit-notification", async (req, res) => {
  try {
    const { order_no, orderId, id } = req.body || {};
    const targetOrder = String(order_no || orderId || id || "").trim();
    if (targetOrder) {
      const localList = getLocalTransactions();
      const t = localList.find((x: any) => x.id === targetOrder || x.order_no === targetOrder);
      if (t) {
        t.notified = true;
        saveLocalTransaction(t);
      }
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          await db.collection("deposits").doc(targetOrder).set({ notified: true }, { merge: true }).catch(() => {});
        }
      } catch (fbErr) {}
    }
    return res.json({ success: true, dismissed: targetOrder });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});




// --- GoPay Payment Gateway Integration (Pay-in) ---
// Capture Endpoint: POST https://mch.go-pay.cyou/pay.php
// Documentation & Testing UI: /gopay or /admin/gopay

// Interactive GoPay Documentation, Testing Portal & Developer Sandbox UI
app.get(["/gopay", "/admin/gopay", "/developer/gopay", "/gopay-tester"], (req, res) => {
  return res.send(renderGoPayPortalHtml());
});

// Calculate GoPay MD5 Hex Validation Signature (API helper)
app.post("/api/gopay/calculate-sign", (req, res) => {
  try {
    const params = req.body?.params || req.body || {};
    const secretKey = req.body?.secret_key || GOPAY_SECRET_KEY;
    const { sign, signStr } = calculateGoPaySignDetails(params, secretKey);
    return res.json({
      success: true,
      sign,
      signStr,
      sign_type: "MD5"
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Send Real/Test Capture Request to GoPay (Capture Endpoint tester)
app.post("/api/gopay/test-capture", async (req, res) => {
  try {
    const {
      trade_amount,
      pay_type,
      goods_name,
      order_no,
      mch_return_msg,
      notify_url,
      page_url,
      app_id,
      secret_key
    } = req.body || {};

    const payload = buildGoPayPayload({
      app_id: app_id || GOPAY_APP_ID,
      secret_key: secret_key || GOPAY_SECRET_KEY,
      order_no: order_no || generateCleanOrderId(),
      trade_amount: trade_amount || 500,
      pay_type: pay_type || "2202",
      goods_name: goods_name || "BKASH",
      notify_url: notify_url || "https://sn777.site/gopay_notify.php",
      page_url: page_url || "https://sn777.site/return",
      mch_return_msg: mch_return_msg || "test_user_101"
    });

    const result = await sendGoPayCaptureRequest(payload);
    return res.json({
      ...result,
      sentPayload: payload.fullParams,
      signStr: payload.signStr,
      sign: payload.sign
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Ping Gateway Health Check
app.get("/api/gopay/ping", async (req, res) => {
  try {
    const start = Date.now();
    const probe = await fetch(GOPAY_API_URL, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000)
    }).catch(e => ({ status: 523, text: () => Promise.resolve(e.message) }));
    
    return res.json({
      httpStatus: probe.status,
      elapsedMs: Date.now() - start,
      endpoint: GOPAY_API_URL
    });
  } catch (err: any) {
    return res.json({ httpStatus: 0, error: err.message });
  }
});

// Return Specifications JSON
app.get("/api/gopay/specs", (req, res) => {
  return res.json({
    endpoint: GOPAY_API_URL,
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    credentials: {
      app_id: { description: "Your unique App ID string (e.g., GP_47479521)", value: GOPAY_APP_ID },
      secret_key: { description: "Your private key. Used to calculate MD5 hashes on backend.", confidential: true }
    },
    parameters: [
      { name: "app_id", type: "String", required: true, description: "Your unique App ID string." },
      { name: "mch_order_no", type: "String", required: true, description: "Unique order reference generated by your platform." },
      { name: "trade_amount", type: "Integer", required: true, description: "Transaction volume in BDT (৳)." },
      { name: "pay_type", type: "String", required: true, description: "Select Channel: 2201 (Nagad) or 2202 (bKash)." },
      { name: "goods_name", type: "String", required: true, description: "Method string: BKASH or NAGAD." },
      { name: "notify_url", type: "String", required: true, description: "Callback script URL to receive webhooks on payment." },
      { name: "page_url", type: "String", required: true, description: "Browser redirect target destination after payment." },
      { name: "mch_return_msg", type: "String", required: true, description: "Custom metadata returned with callback webhooks." },
      { name: "order_date", type: "String", required: true, description: "Datetime string in YYYY-MM-DD HH:MM:SS format." },
      { name: "sign", type: "String", required: true, description: "Calculated MD5 Hex validation signature." },
      { name: "sign_type", type: "String", required: true, description: "Use: MD5." }
    ]
  });
});

// Simulate Webhook Callback (/gopay_notify.php simulation)
app.post("/api/gopay/simulate-webhook", async (req, res) => {
  try {
    const { order_no, amount, mch_return_msg } = req.body || {};
    const orderNo = order_no || ("ORD" + Date.now());
    const tradeAmount = Number(amount) || 500;
    const tradeNo = "TN" + Date.now();

    const callbackParams: Record<string, any> = {
      mchOrderNo: orderNo,
      mch_order_no: orderNo,
      amount: String(tradeAmount),
      trade_amount: String(tradeAmount),
      tradeResult: "1",
      tradeNo: tradeNo,
      trade_no: tradeNo,
      mch_return_msg: mch_return_msg || "test_user_101",
      sign_type: "MD5"
    };

    const sign = generateGoPaySign(callbackParams, GOPAY_SECRET_KEY);
    callbackParams.sign = sign;

    // Trigger local notify endpoint
    const notifyRes = await fetch("http://localhost:3000/gopay_notify.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(callbackParams).toString()
    });

    const notifyText = await notifyRes.text();
    return res.json({
      success: notifyText.trim() === "success",
      gatewayResponse: notifyText,
      callbackPayload: callbackParams,
      sign
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Main GoPay Deposit Initiate (Pay-in) Handler
// POST/GET /pay.php, /gopay_pay.php, /api/create-payment, /api/gopay/pay
app.all(["/pay.php", "/gopay_pay.php", "/api/create-payment", "/api/gopay/pay", "/api/gopay/deposit"], async (req, res) => {
  try {
    let rawUid = String(req.query.uid || req.body?.uid || req.query.username || req.body?.username || "").trim();
    if (!rawUid) {
      rawUid = "user_" + Date.now();
    }
    const rawAmount = req.query.amount || req.body?.amount || req.query.trade_amount || req.body?.trade_amount || 200;
    const rawMethod = String(req.query.method || req.body?.method || req.query.goods_name || req.body?.goods_name || "bkash").trim().toLowerCase();
    const minAmount = 200;
    let amount = Math.round(parseFloat(String(rawAmount)) || minAmount);

    if (amount < minAmount) {
      const noticeText = "পেমেন্ট গেটওয়ের লিমিটের সমস্যার কারণে এই মুহূর্তে ছোট এমাউন্ট ডিপোজিট প্রসেস করা যাচ্ছে না। সফল ডিপোজিটের জন্য অনুগ্রহ করে বড় অংকের অ্যামাউন্ট চেষ্টা করুন অথবা কিছুক্ষণ অপেক্ষা করে আবার ট্রাই করুন। ধন্যবাদ সহযোগিতার জন্য!";
      if (req.xhr || req.headers.accept?.includes("application/json") || req.path.includes("/api/")) {
        return res.status(400).json({
          success: false,
          respCode: "FAIL",
          tradeMsg: noticeText
        });
      }
      return res.send(renderLimitNoticeHtml(noticeText));
    }

    const customOrderNo = String(req.query.order_no || req.body?.order_no || req.query.mch_order_no || req.body?.mch_order_no || "").trim();
    const order_no = generateCleanOrderId(customOrderNo);
    let username = String(req.query.username || req.body?.username || "").trim();
    let phone = String(req.query.phone || req.body?.phone || "").trim();

    const adminApp = getFirebaseAdmin();
    if (adminApp && rawUid && (!username || !phone)) {
      try {
        const uSnap = await adminApp.firestore().collection("users").doc(rawUid).get().catch(() => null);
        if (uSnap && uSnap.exists) {
          const uData = uSnap.data() || {};
          if (!username) username = uData.username || uData.name || rawUid;
          if (!phone) phone = uData.phone || uData.phoneNumber || "";
        }
      } catch (e) {}
    }

    const isNagad = rawMethod.includes("nagad") || String(req.query.pay_type || req.body?.pay_type) === "2201";
    const pay_type = isNagad ? "2201" : "2202";
    const goods_name = isNagad ? "NAGAD" : "BKASH";
    const formattedPayType = isNagad ? "Nagad" : "Bkash";

    // Build the GoPay signed payload according to exact documentation:
    // app_id, mch_order_no, trade_amount (int), pay_type, goods_name, notify_url, page_url, mch_return_msg, order_date, sign, sign_type
    const gopayPayload = buildGoPayPayload({
      order_no,
      trade_amount: amount,
      pay_type,
      goods_name,
      notify_url: "https://sn777.site/gopay_notify.php",
      page_url: "https://sn777.site/return?order_no=" + encodeURIComponent(order_no),
      mch_return_msg: String(rawUid).substring(0, 32)
    });

    const nowIso = new Date().toISOString();
    let userBalance = 0;
    if (adminApp && rawUid) {
      try {
        const uDoc = await adminApp.firestore().collection("users").doc(rawUid).get().catch(() => null);
        if (uDoc && uDoc.exists) {
          userBalance = uDoc.data()?.balance || uDoc.data()?.wallet || 0;
        }
      } catch (e) {}
    }

    const pendingTx: any = {
      id: order_no,
      order_no: order_no,
      orderId: order_no,
      mch_order_no: order_no,
      uid: rawUid,
      username: username || rawUid,
      userBalance: userBalance,
      balance: userBalance,
      phone: phone || "",
      type: "deposit",
      amount: amount,
      method: goods_name.toLowerCase(),
      payType: formattedPayType,
      pay_type: pay_type,
      goods_name: goods_name,
      status: "pending",
      gateway: "gopay",
      domain: "sn777.site",
      timestamp: nowIso,
      createdAt: nowIso,
      submittedAt: nowIso,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
      description: `GoPay ${formattedPayType} Deposit`,
      notifyAdmin: true,
      manual_approval_allowed: true,
      displayAmount: amount,
      finalAmount: amount,
      user_id: rawUid,
      sign: gopayPayload.sign,
      server_timestamp: Date.now()
    };

    saveLocalTransaction(pendingTx);
    if (adminApp) {
      const db = adminApp.firestore();
      const dbCustom = getFirestoreDb();
      await Promise.allSettled([
        db.collection("deposits").doc(order_no).set(pendingTx, { merge: true }),
        db.collection("transactions").doc(order_no).set(pendingTx, { merge: true }),
        dbCustom ? dbCustom.collection("deposits").doc(order_no).set(pendingTx, { merge: true }) : Promise.resolve(),
        dbCustom ? dbCustom.collection("transactions").doc(order_no).set(pendingTx, { merge: true }) : Promise.resolve(),
        firestoreRestPatch("deposits", order_no, pendingTx, "(default)"),
        firestoreRestPatch("deposits", order_no, pendingTx, FS_DB_ID)
      ]).catch(e => console.error("Firestore save error:", e));

      console.log(`[GoPay Deposit Sync] Order ${order_no} synced to Firestore.`);
    }

    console.log(`[GoPay Pay-in Initiate] POST ${GOPAY_API_URL} order ${order_no}, amount ${amount}, method: ${goods_name}`);

    // Dispatch request to GoPay capture endpoint
    const gatewayResult = await sendGoPayCaptureRequest(gopayPayload);
    const fallbackUrl = `/cashier.php?order_no=${encodeURIComponent(order_no)}&amount=${encodeURIComponent(amount)}&method=${encodeURIComponent(rawMethod)}&uid=${encodeURIComponent(rawUid)}`;

    if (gatewayResult.success && gatewayResult.payUrl) {
      if (req.xhr || req.headers.accept?.includes("application/json") || req.path.includes("/api/")) {
        return res.json({
          respCode: "SUCCESS",
          success: true,
          tradeMsg: gatewayResult.tradeMsg || "request success",
          payUrl: gatewayResult.payUrl,
          pay_url: gatewayResult.payUrl,
          tradeNo: gatewayResult.tradeNo || "",
          order_no: order_no
        });
      }
      return res.redirect(gatewayResult.payUrl);
    } else {
      // Gateway limit error (e.g. ORDER_AMT_SINGLE_PEN_LIMIT:400-50001) or origin unreachable
      // Smoothly redirect API and browser requests to Cashier so 200/300 Tk deposits complete without error
      console.warn(`[GoPay Pay-in Notice] Gateway returned http ${gatewayResult.httpStatus}, msg: ${gatewayResult.tradeMsg}. Redirecting to Cashier.`);

      if (req.xhr || req.headers.accept?.includes("application/json") || req.path.includes("/api/")) {
        return res.json({
          respCode: "SUCCESS",
          success: true,
          tradeMsg: "Cashier Fallback",
          payUrl: fallbackUrl,
          pay_url: fallbackUrl,
          order_no: order_no
        });
      }

      // If browser navigation, smoothly redirect to Cashier so user can complete payment
      return res.send(renderCashierHtml(order_no, amount, rawMethod, rawUid));
    }
  } catch (err: any) {
    console.error("[GoPay Pay-in Exception]:", err);
    const order_no = req.query?.order_no || req.body?.order_no || ("ORD" + Date.now());
    const amount = parseFloat(req.query?.amount || req.body?.amount || 500) || 500;
    const method = req.query?.method || req.body?.method || "bkash";
    const uid = req.query?.uid || req.body?.uid || "user";

    if (req.xhr || req.headers.accept?.includes("application/json") || req.path.includes("/api/")) {
      return res.json({
        respCode: "SUCCESS",
        success: true,
        payUrl: `/cashier.php?order_no=${encodeURIComponent(order_no)}&amount=${encodeURIComponent(amount)}&method=${encodeURIComponent(method)}&uid=${encodeURIComponent(uid)}`,
        order_no
      });
    }
    return res.send(renderCashierHtml(order_no, amount, method, uid));
  }
});

// Helper for rendering Ultra-Modern Deposit Limit / Notice Modal HTML
function renderLimitNoticeHtml(customMsg?: string): string {
  const msg = customMsg || "পেমেন্ট গেটওয়ের লিমিটের সমস্যার কারণে এই মুহূর্তে ছোট এমাউন্ট ডিপোজিট প্রসেস করা যাচ্ছে না। সফল ডিপোজিটের জন্য অনুগ্রহ করে বড় অংকের অ্যামাউন্ট চেষ্টা করুন অথবা কিছুক্ষণ অপেক্ষা করে আবার ট্রাই করুন। ধন্যবাদ সহযোগিতার জন্য!";
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>পেমেন্ট আপডেট নোটিশ - SN777</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background-color: #030712;
      background-image: radial-gradient(circle at 50% 30%, #1e293b 0%, #030712 75%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .modal-card {
      background: linear-gradient(165deg, #131b2e 0%, #0d1322 60%, #080c17 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.4);
      border-radius: 28px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.2);
      text-align: center;
      position: relative;
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.92) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-wrapper {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.5);
      font-size: 34px;
    }
    .title {
      font-size: 20px;
      font-weight: 900;
      color: #fbbf24;
      margin: 0 0 14px 0;
      letter-spacing: -0.3px;
      text-transform: uppercase;
    }
    .msg-box {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 18px 16px;
      margin-bottom: 24px;
    }
    .msg-text {
      font-size: 13.5px;
      color: #e2e8f0;
      font-weight: 600;
      margin: 0;
      line-height: 1.65;
      letter-spacing: 0.1px;
    }
    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #00559b 0%, #0077d9 100%);
      color: #ffffff;
      border: none;
      border-radius: 18px;
      padding: 15px 20px;
      font-size: 14px;
      font-weight: 900;
      width: 100%;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(0, 85, 155, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: transform 0.15s ease;
    }
    .btn-action:active {
      transform: scale(0.97);
    }
  </style>
</head>
<body>
  <div class="modal-card">
    <div class="icon-wrapper">⚠️</div>
    <div class="title">পেমেন্ট আপডেট নোটিশ</div>
    <div class="msg-box">
      <p class="msg-text">${msg}</p>
    </div>
    <a href="javascript:history.back()" class="btn-action">← ঠিক আছে (ফিরে যান)</a>
  </div>
</body>
</html>`;
}

// Helper for rendering Native Cashier HTML
function renderCashierHtml(order_no: string, amount: number, method: string, uid: string, walletNum: string = "01996306610"): string {
  const isNagad = String(method).toLowerCase().includes("nagad");
  const brandName = isNagad ? "নগদ (Nagad)" : "বিকাশ (bKash)";
  const brandColor = isNagad ? "#eb1c24" : "#e2136e";
  const btnStyle = isNagad ? "background-color: #eb1c24;" : "background-color: #c2185b;";

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Sn777 ${brandName} Cashier</title>
  <style>
    * { box-sizing: border-box; }
    body { background-color: #f1f5f9; margin: 0; padding: 12px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; display: flex; justify-content: center; min-height: 100vh; }
    .card { width: 100%; max-width: 420px; background: #ffffff; border-radius: 16px; border: 1.5px solid #cbd5e1; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); height: fit-content; }
    .topbar { background: #00684a; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .topbar-title { font-size: 22px; font-weight: 800; line-height: 1.1; }
    .topbar-sub { font-size: 12px; opacity: 0.95; margin-top: 2px; }
    .alert-box { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; margin: 12px; padding: 10px; text-align: center; color: #d1293d; font-weight: 700; font-size: 13px; line-height: 1.4; }
    .brand-banner { padding: 12px 16px; color: white; display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 17px; background: ${brandColor}; }
    .section { padding: 12px 16px; }
    .label { font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px; display: block; }
    .num-box { background: #f0f4f8; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; font-family: monospace; font-size: 18px; font-weight: 800; color: #0f172a; }
    .copy-btn { background: #c6f6d5; color: #065f46; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    .input-field { width: 100%; height: 46px; border: 2px solid #3b82f6; border-radius: 10px; padding: 0 14px; font-size: 16px; font-weight: 700; text-transform: uppercase; outline: none; margin-top: 4px; }
    .submit-btn { width: 100%; height: 48px; border-radius: 9999px; font-size: 16px; font-weight: 800; border: none; color: white; cursor: pointer; margin-top: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); ${btnStyle} }
    .submit-btn:active { transform: scale(0.98); }
    .back-link { text-align: center; margin-top: 10px; margin-bottom: 16px; }
    .back-link a { color: #64748b; font-weight: 700; font-size: 13px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="topbar">
      <div>
        <div class="topbar-title">৳ ${amount.toFixed(2)}</div>
        <div class="topbar-sub">অর্ডার আইডি: ${order_no}</div>
      </div>
      <div style="text-align:right">
        <span style="background:#fff;color:#00684a;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px">সিকিউর ক্যাশিয়ার</span>
      </div>
    </div>

    <div class="brand-banner">
      <div>${brandName} Send Money / Cash Out</div>
      <div style="font-size:12px;opacity:0.9">ইনস্ট্যান্ট প্রসেসিং</div>
    </div>

    <div class="alert-box">
      ⚠️ আপনার ${brandName} মোবাইল অ্যাপ বা ডায়াল কোড ব্যবহার করে নিচের নাম্বারে <strong>৳${amount}</strong> টাকা প্রদান করুন এবং TrxID বসিয়ে সাবমিট করুন।
    </div>

    <div class="section">
      <span class="label">১. রিসিভিং ওয়ালেট নাম্বার:</span>
      <div class="num-box">
        <span id="walletNum">${walletNum}</span>
        <button type="button" class="copy-btn" onclick="copyWallet()">📋 কপি করুন</button>
      </div>
    </div>

    <form action="/api/submit-deposit-trx" method="POST" class="section">
      <input type="hidden" name="order_no" value="${order_no}">
      <input type="hidden" name="amount" value="${amount}">
      <input type="hidden" name="method" value="${method}">
      <input type="hidden" name="uid" value="${uid}">

      <span class="label">২. টাকা পাঠানোর পর প্রাপ্ত TrxID (ট্রানজেকশন আইডি) লিখুন:</span>
      <input type="text" name="trx_id" required placeholder="উদাহরণ: 8N7A6D5E" class="input-field" autocomplete="off" dir="ltr">

      <button type="submit" class="submit-btn">
        কনফার্ম ডিপোজিট ৳ ${amount}
      </button>
    </form>

    <div class="back-link">
      <a href="/">← মূল পাতায় ফিরে যান</a>
    </div>
  </div>

  <script>
    function copyWallet() {
      var num = document.getElementById("walletNum").innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(function() {
          alert("নাম্বার কপি হয়েছে: " + num);
        }).catch(function() {
          alert("নাম্বার: " + num);
        });
      } else {
        alert("নাম্বার: " + num);
      }
    }
  </script>
</body>
</html>`;
}

// Cashier Route
app.all(["/cashier.php", "/cashier"], (req, res) => {
  const order_no = String(req.query.order_no || req.body?.order_no || ("ORD" + Date.now())).trim();
  const amount = parseFloat(String(req.query.amount || req.body?.amount || 500)) || 500;
  const method = String(req.query.method || req.body?.method || "bkash").trim();
  const uid = String(req.query.uid || req.body?.uid || "user").trim();

  return res.send(renderCashierHtml(order_no, amount, method, uid));
});

// Submit TrxID handler
app.post("/api/submit-deposit-trx", async (req, res) => {
  try {
    const order_no = String(req.body.order_no || "").trim();
    const amount = parseFloat(String(req.body.amount || 0)) || 0;
    const method = String(req.body.method || "bkash").trim();
    const uid = String(req.body.uid || "user").trim();
    const trx_id = String(req.body.trx_id || "").trim().toUpperCase();

    console.log(`[Deposit Trx Submit] Order: ${order_no}, TrxID: ${trx_id}, Amount: ${amount}, Method: ${method}, UID: ${uid}`);

    const nowIso = new Date().toISOString();
    const updatedTx = {
      id: order_no,
      order_no,
      uid,
      type: "deposit",
      amount,
      method,
      trx_id,
      tradeNo: trx_id,
      status: "pending_verification",
      gateway: "manual",
      timestamp: nowIso,
      updatedAt: nowIso,
      description: `Deposit ${amount} BDT via ${method.toUpperCase()} (TrxID: ${trx_id})`
    };

    saveLocalTransaction(updatedTx);

    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const db = adminApp.firestore();
      db.collection("deposits").doc(order_no).set(updatedTx, { merge: true }).catch(() => {});
      db.collection("transactions").doc(order_no).set(updatedTx, { merge: true }).catch(() => {});
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, message: "TrxID submitted successfully", order_no, trx_id });
    }

    return res.redirect(`/?m=1&order_no=${encodeURIComponent(order_no)}&trx=${encodeURIComponent(trx_id)}`);
  } catch (err: any) {
    console.error("[Submit Trx Error]:", err);
    return res.redirect(`/?m=1`);
  }
});

// Helper to extract callback data from any body or query encoding
function extractCallbackData(req: any): Record<string, any> {
  let rawData: Record<string, any> = {};
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
    rawData = { ...req.body };
  } else if (typeof req.body === "string" && req.body.trim()) {
    const trimmed = req.body.trim();
    if (trimmed.startsWith("{")) {
      try { rawData = JSON.parse(trimmed); } catch (e) {}
    } else {
      try {
        const usp = new URLSearchParams(trimmed);
        for (const [k, v] of usp.entries()) {
          rawData[k] = v;
        }
      } catch (e) {}
    }
  }
  if (Object.keys(rawData).length === 0 && req.query && Object.keys(req.query).length > 0) {
    rawData = { ...req.query };
  }
  return rawData;
}

// GoPay Webhook Callback (Pay-in)
app.all(["/gopay_notify.php", "/callback.php", "/notify.php", "/api/gopay-notify", "/api/gopay/notify"], async (req, res) => {
  try {
    const rawData = extractCallbackData(req);
    if (!rawData || Object.keys(rawData).length === 0) {
      return res.status(200).send("fail");
    }

    // Signature verification per GoPay spec
    const receivedSign = String(rawData.sign || "").toLowerCase().trim();
    
    // Omit sign, sign_type, and signType from params for signature verification
    const signParams = { ...rawData };
    delete signParams.sign;
    delete signParams.signType;
    delete signParams.sign_type;
    delete signParams.signtype;
    
    const calculatedSign = generateGoPaySign(signParams, GOPAY_SECRET_KEY);

    const tradeResult = String(rawData.tradeResult || "").trim();
    const isSuccess = tradeResult === "1";

    const order_no = String(rawData.mchOrderNo || rawData.mch_order_no || "").trim();
    const amount = parseFloat(String(rawData.amount || rawData.trade_amount || 0)) || 0;

    console.log(`[Gateway Webhook] Callback: order=${order_no}, amount=${amount}, success=${isSuccess}, signMatch=${calculatedSign === receivedSign}`);

    if (calculatedSign !== receivedSign) {
      console.warn(`[Gateway Webhook] Signature mismatch! calc: ${calculatedSign}, recv: ${receivedSign}`);
      return res.status(200).send("fail");
    }

    if (isSuccess && order_no) {
      try {
        const uid = String(rawData.mch_return_msg || rawData.uid || "").trim();
        await approveAndCreditDeposit(order_no, amount, uid, String(rawData.tradeNo || ""), rawData);
        console.log(`[Gateway Webhook] Approved order ${order_no}`);
      } catch (bgErr) {
        console.error("[Gateway Webhook Process Error]:", bgErr);
      }
      return res.status(200).send("success");
    }

    return res.status(200).send("fail");
  } catch (err: any) {
    console.error("[Gateway Webhook Error]:", err);
    return res.status(200).send("fail");
  }
});


// Endpoint to check GoPay Merchant Available Balance
app.all(["/api/gopay/balance", "/balance_query.php"], async (req, res) => {
  try {
    const timestamp = formatGoPayOrderDate();
    const balanceParams: Record<string, any> = {
      app_id: GOPAY_APP_ID,
      timestamp: timestamp,
      sign_type: "MD5"
    };

    const gopaySign = generateGoPaySign(balanceParams, GOPAY_SECRET_KEY);

    const searchParams = new URLSearchParams();
    Object.keys(balanceParams).sort().forEach(key => {
      if (key !== "sign" && key !== "sign_type") {
        searchParams.append(key, String(balanceParams[key]));
      }
    });
    searchParams.append("sign", gopaySign);
    searchParams.append("sign_type", "MD5");

    const response = await fetch("https://mch.go-pay.cyou/balance_api.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: searchParams.toString(),
      signal: AbortSignal.timeout(10000)
    });

    const data: any = await response.json().catch(() => null);
    if (data && data.respCode === "SUCCESS") {
      return res.json({
        respCode: "SUCCESS",
        success: true,
        balance: data.balance,
        currency: data.currency || "BDT",
        message: `Available Balance: ${data.balance} ${data.currency || 'BDT'}`
      });
    }

    return res.status(400).json({
      respCode: data?.respCode || "FAIL",
      success: false,
      tradeMsg: data?.tradeMsg || "Query failed"
    });
  } catch (err: any) {
    return res.status(500).json({
      respCode: "FAIL",
      success: false,
      tradeMsg: err.message || "Connection Failed"
    });
  }
});

// Endpoint to quickly check user balance from local store or memory
app.get("/api/user-balance", (req, res) => {
  const uid = String(req.query.uid || req.query.username || "").trim();
  if (!uid) return res.json({ success: true, balance: "777.00" });
  const bal = getLocalUserBalance(uid);
  return res.json({ success: true, balance: bal.toFixed(2) });
});

// Payment Return / Success Page (return / success.php)
app.all(["/return", "/success.php", "/success"], (req, res) => {
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

  const staticOptions = {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res: any, filePath: string) => {
      if (filePath.includes('/assets/') || filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.webp') || filePath.endsWith('.png') || filePath.endsWith('.woff2') || filePath.endsWith('.jpg') || filePath.endsWith('.svg')) {
        res.setHeader("Cache-Control", "public, max-age=2592000, stale-while-revalidate=604800, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    }
  };
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, staticOptions));
  }
  app.use(express.static(distPath, staticOptions));
  if (fs.existsSync(distBackupPath)) {
    app.use(express.static(distBackupPath, staticOptions));
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "custom",
      });
      app.use(vite.middlewares);
      console.log("[Dev Server] Vite middleware successfully mounted");
    } catch (e: any) {
      console.warn("[Dev Server] Vite middleware notice:", e?.message);
    }
  }

  // Fallback route for static assets
  app.get('/assets/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    const fileInDist = path.join(distPath, 'assets', filename);
    const fileInBackup = path.join(distBackupPath, 'assets', filename);

    res.setHeader("Cache-Control", "public, max-age=2592000, stale-while-revalidate=604800, immutable");

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

  // Explicit PWA routes for Service Worker and Web App Manifest
  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(process.cwd(), 'manifest.json');
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(manifestPath);
  });

  app.get('/sw.js', (req, res) => {
    const swPath = fs.existsSync(path.join(process.cwd(), 'sw.js'))
      ? path.join(process.cwd(), 'sw.js')
      : fs.existsSync(path.join(distPath, 'sw.js'))
      ? path.join(distPath, 'sw.js')
      : path.join(distBackupPath, 'sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(swPath);
  });

  // SPA fallback with ultra-fast validation
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/__aistudio') || req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
      ? path.join(distPath, 'index.html')
      : path.join(distBackupPath, 'index.html');
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(indexPath);
  });

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    setTimeout(() => {
      try {
        reconcileUncreditedApprovedDeposits();
      } catch (err) {
        console.warn("[Reconciler Safe Catch]:", err);
      }
    }, 3000);
  });


}

startServer();
