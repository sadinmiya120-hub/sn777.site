"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_express = __toESM(require("express"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_multer = __toESM(require("multer"), 1);

// sms_verifier.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var SMS_LOGS_FILE = import_path.default.join(process.cwd(), "data", "sms_logs.json");
var SMS_POOL_FILE = import_path.default.join(process.cwd(), "data", "verified_sms_pool.json");
var SMS_SETTINGS_FILE = import_path.default.join(process.cwd(), "data", "sms_settings.json");
function ensureDataDir() {
  const dataDir = import_path.default.join(process.cwd(), "data");
  if (!import_fs.default.existsSync(dataDir)) {
    import_fs.default.mkdirSync(dataDir, { recursive: true });
  }
}
function convertBengaliDigits(str) {
  const bnDigits = ["\u09E6", "\u09E7", "\u09E8", "\u09E9", "\u09EA", "\u09EB", "\u09EC", "\u09ED", "\u09EE", "\u09EF"];
  return str.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
}
function parseSms(rawText, senderHint = "") {
  if (!rawText || typeof rawText !== "string") return null;
  const raw = rawText.trim();
  const normalizedText = convertBengaliDigits(raw);
  const lowerHint = (senderHint + " " + normalizedText).toLowerCase();
  let provider = "unknown";
  if (lowerHint.includes("bkash") || lowerHint.includes("16247") || lowerHint.includes("\u09AC\u09BF\u0995\u09BE\u09B6")) {
    provider = "bkash";
  } else if (lowerHint.includes("nagad") || lowerHint.includes("16167") || lowerHint.includes("\u09A8\u0997\u09A6")) {
    provider = "nagad";
  } else if (lowerHint.includes("rocket") || lowerHint.includes("16216") || lowerHint.includes("dbbl") || lowerHint.includes("\u09B0\u0995\u09C7\u099F")) {
    provider = "rocket";
  } else if (lowerHint.includes("upay") || lowerHint.includes("16268") || lowerHint.includes("\u0989\u09AA\u09BE\u09DF")) {
    provider = "upay";
  } else if (lowerHint.includes("received tk") || lowerHint.includes("trxid")) {
    provider = "bkash";
  } else if (lowerHint.includes("txnid") || lowerHint.includes("payment received")) {
    provider = "nagad";
  }
  let trxId = null;
  const trxMatch = normalizedText.match(
    /(?:TrxID|TxnID|TxnId|Txn ID|Trx ID|Trans ID|Transaction ID|ID)[\s:=]+([A-Za-z0-9_-]{6,32})/i
  );
  if (trxMatch && trxMatch[1]) {
    trxId = trxMatch[1].trim().toUpperCase();
  } else {
    const standaloneMatch = normalizedText.match(/\b([A-Z0-9]{8,14})\b/);
    if (standaloneMatch && !standaloneMatch[1].startsWith("01") && !standaloneMatch[1].startsWith("880")) {
      trxId = standaloneMatch[1].trim().toUpperCase();
    }
  }
  let amount = null;
  const amountMatch = normalizedText.match(
    /(?:Amount\s*[:=]?\s*)?(?:Tk\.?|BDT|টাকা)\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  } else {
    const altAmount = normalizedText.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:Tk\.?|BDT|টাকা)/i);
    if (altAmount && altAmount[1]) {
      amount = parseFloat(altAmount[1].replace(/,/g, ""));
    }
  }
  let senderPhone = null;
  const phoneMatch = normalizedText.match(
    /(?:from|Sender\s*[:=]?|প্রেরক\s*[:=]?)\s*(\+?880[0-9]{8,11}|01[3-9][0-9]{8})/i
  );
  if (phoneMatch && phoneMatch[1]) {
    senderPhone = phoneMatch[1].trim();
  }
  return {
    provider,
    trxId,
    amount: amount !== null && !isNaN(amount) ? amount : null,
    senderPhone,
    raw,
    senderHint,
    detectedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getSmsSettings() {
  ensureDataDir();
  const defaultSettings = {
    enabled: true,
    secretKey: "sn777_auto_verify",
    autoApprove: true,
    allowAdminManualPaste: true,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    if (import_fs.default.existsSync(SMS_SETTINGS_FILE)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(SMS_SETTINGS_FILE, "utf8"));
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn("[getSmsSettings] Error reading settings:", e);
  }
  return defaultSettings;
}
function saveSmsSettings(settings) {
  ensureDataDir();
  const current = getSmsSettings();
  const updated = {
    ...current,
    ...settings,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    import_fs.default.writeFileSync(SMS_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf8");
  } catch (e) {
    console.error("[saveSmsSettings] Error writing settings:", e);
  }
  return updated;
}
function getSmsLogs() {
  ensureDataDir();
  try {
    if (import_fs.default.existsSync(SMS_LOGS_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(SMS_LOGS_FILE, "utf8")) || [];
    }
  } catch (e) {
    console.warn("[getSmsLogs] Error reading logs:", e);
  }
  return [];
}
function saveSmsLog(log) {
  ensureDataDir();
  try {
    const logs = getSmsLogs();
    logs.unshift(log);
    const trimmed = logs.slice(0, 500);
    import_fs.default.writeFileSync(SMS_LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("[saveSmsLog] Error writing log:", e);
  }
}
function getVerifiedSmsPool() {
  ensureDataDir();
  try {
    if (import_fs.default.existsSync(SMS_POOL_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(SMS_POOL_FILE, "utf8")) || [];
    }
  } catch (e) {
    console.warn("[getVerifiedSmsPool] Error reading pool:", e);
  }
  return [];
}
function saveVerifiedSmsPool(pool) {
  ensureDataDir();
  try {
    const trimmed = pool.slice(0, 500);
    import_fs.default.writeFileSync(SMS_POOL_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("[saveVerifiedSmsPool] Error writing pool:", e);
  }
}
function addToVerifiedPool(item) {
  const pool = getVerifiedSmsPool();
  const cleanTrxId = item.trxId.toUpperCase().trim();
  const existingIdx = pool.findIndex((x) => x.trxId.toUpperCase() === cleanTrxId);
  const newItem = {
    ...item,
    trxId: cleanTrxId,
    claimed: false
  };
  if (existingIdx >= 0) {
    if (pool[existingIdx].claimed) {
      return pool[existingIdx];
    }
    pool[existingIdx] = newItem;
  } else {
    pool.unshift(newItem);
  }
  saveVerifiedSmsPool(pool);
  return newItem;
}
function findMatchingSmsInPool(trxId, requestedAmount) {
  if (!trxId) return null;
  const cleanTrxId = String(trxId).trim().toUpperCase();
  const pool = getVerifiedSmsPool();
  const found = pool.find((item) => {
    if (item.claimed) return false;
    if (item.trxId.toUpperCase() !== cleanTrxId) return false;
    if (requestedAmount && requestedAmount > 0) {
      if (item.amount && item.amount !== requestedAmount) {
        console.log(`[SMS Pool] TrxID matched (${cleanTrxId}) but amount differed: pool=${item.amount}, requested=${requestedAmount}`);
      }
    }
    return true;
  });
  return found || null;
}
function claimPoolSms(trxId, orderNo, uid) {
  if (!trxId) return false;
  const cleanTrxId = String(trxId).trim().toUpperCase();
  const pool = getVerifiedSmsPool();
  const idx = pool.findIndex((item) => item.trxId.toUpperCase() === cleanTrxId);
  if (idx >= 0) {
    pool[idx].claimed = true;
    pool[idx].claimedAt = (/* @__PURE__ */ new Date()).toISOString();
    pool[idx].claimedOrderNo = orderNo;
    pool[idx].claimedByUid = uid;
    saveVerifiedSmsPool(pool);
    return true;
  }
  return false;
}

// server.ts
function getDepositFinalCredit(paidAmount, rawBonusOption, reqFinalCredit) {
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
  const bonusAmount = Math.round(deposit * (bonusPercent / 100));
  const finalCredit = deposit + bonusAmount;
  return { finalCredit, bonusAmount };
}
function isGenericUid(u) {
  if (!u) return true;
  const str = String(u).trim().toLowerCase();
  return str === "" || str === "sn777_user" || str === "sn777" || str === "user" || str === "null" || str === "undefined" || str === "\u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BE\u09AE" || str === "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0" || str.startsWith("guest_");
}
var appDir = process.cwd();
var upload = (0, import_multer.default)();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use((req, res, next) => {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
  if (host.includes("sn777.top")) {
    return res.redirect(301, `https://sn777.site${req.originalUrl || req.url || ""}`);
  }
  next();
});
app.use((0, import_compression.default)());
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.use(import_express.default.text({ type: ["text/*", "application/*"], limit: "50mb" }));
app.use((err, _req, res, next) => {
  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    return res.status(413).json({ success: false, error: "Payload too large. Please upload a smaller file." });
  }
  next(err);
});
app.use((req, _res, next) => {
  if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
    }
  }
  next();
});
var firestoreQuotaExceededUntil = 0;
async function getFirestoreDepositsSafe(adminApp) {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return [];
  }
  try {
    const depSnap = await Promise.race([
      adminApp.firestore().collection("deposits").limit(100).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 800))
    ]);
    return depSnap?.docs?.map((d) => ({ id: d.id, order_no: d.id, ...d.data() })) || [];
  } catch (err) {
    if (err?.message?.includes("Quota exceeded") || err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Firestore quota exceeded on deposits, activating circuit breaker for 60s");
      firestoreQuotaExceededUntil = Date.now() + 6e4;
    }
    return [];
  }
}
async function getFirestoreWithdrawalsSafe(adminApp) {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return [];
  }
  try {
    const wthSnap = await Promise.race([
      adminApp.firestore().collection("withdrawals").limit(100).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 800))
    ]);
    return wthSnap?.docs?.map((d) => ({ id: d.id, withdrawNo: d.id, ...d.data() })) || [];
  } catch (err) {
    if (err?.message?.includes("Quota exceeded") || err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Firestore quota exceeded on withdrawals, activating circuit breaker for 60s");
      firestoreQuotaExceededUntil = Date.now() + 6e4;
    }
    return [];
  }
}
var TARGET_FIRESTORE_DATABASE_ID = "ai-studio-sn777site-c8c0dbda-551f-4b00-a0b0-12cb12672e48";
var paymentOrdersCache = /* @__PURE__ */ new Map();
function getFirebaseAdmin() {
  if (import_firebase_admin.default.apps.length === 0) {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawKey && rawKey.trim() !== "{}" && rawKey.trim() !== "") {
      try {
        const serviceAccount = JSON.parse(rawKey);
        if (serviceAccount && serviceAccount.project_id) {
          import_firebase_admin.default.initializeApp({
            credential: import_firebase_admin.default.credential.cert(serviceAccount),
            databaseURL: "https://xbet-mobcash-default-rtdb.firebaseio.com"
          });
        }
      } catch (e) {
        console.error("Firebase Admin init error:", e);
      }
    }
  }
  return import_firebase_admin.default.apps.length > 0 ? import_firebase_admin.default : null;
}
function getFirestoreDb() {
  const adminApp = getFirebaseAdmin();
  if (!adminApp) return null;
  try {
    const { getFirestore } = require("firebase-admin/firestore");
    return getFirestore(TARGET_FIRESTORE_DATABASE_ID);
  } catch (e) {
    try {
      return adminApp.firestore();
    } catch (err) {
      return null;
    }
  }
}
var FIREBASE_APPLET_CONFIG_PATH = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
var fbConfig = {};
if (import_fs2.default.existsSync(FIREBASE_APPLET_CONFIG_PATH)) {
  try {
    fbConfig = JSON.parse(import_fs2.default.readFileSync(FIREBASE_APPLET_CONFIG_PATH, "utf8"));
  } catch (e) {
  }
}
var FS_PROJECT_ID = fbConfig.projectId || "xbet-mobcash";
var FS_DB_ID = fbConfig.firestoreDatabaseId || TARGET_FIRESTORE_DATABASE_ID;
var FS_API_KEY = fbConfig.apiKey || "AIzaSyAnjT1kOKf0WioVow4gQv63KUjIycn2FWI";
async function firestoreRestPatch(collectionPath, docId, fields, targetDbId) {
  try {
    const dbId = targetDbId || FS_DB_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT_ID}/databases/${dbId}/documents/${collectionPath}/${docId}?key=${FS_API_KEY}`;
    const firestoreFields = {};
    const updateMask = [];
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
      } else if (val === null || val === void 0) {
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
  } catch (err) {
    console.warn(`[firestoreRestPatch] Error patching ${collectionPath}/${docId}:`, err?.message);
    return false;
  }
}
async function firestoreRestGet(collectionPath, docId, targetDbId) {
  try {
    const dbId = targetDbId || FS_DB_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT_ID}/databases/${dbId}/documents/${collectionPath}/${docId}?key=${FS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const fields = {};
    if (data.fields) {
      for (const [k, v] of Object.entries(data.fields)) {
        if (v.stringValue !== void 0) fields[k] = v.stringValue;
        else if (v.integerValue !== void 0) fields[k] = parseInt(v.integerValue, 10);
        else if (v.doubleValue !== void 0) fields[k] = v.doubleValue;
        else if (v.booleanValue !== void 0) fields[k] = v.booleanValue;
        else if (v.nullValue !== void 0) fields[k] = null;
      }
    }
    return fields;
  } catch (err) {
    return null;
  }
}
app.all("/api/auth-proxy/:host/{*splat}", async (req, res) => {
  try {
    const { host } = req.params;
    const urlParts = req.url.split(`/api/auth-proxy/${host}/`);
    const pathAndQuery = urlParts[1] || "";
    const targetUrl = `https://${host}/${pathAndQuery}`;
    console.log(`[Auth Proxy] Forwarding request to: ${targetUrl}`);
    const headers = {
      "Content-Type": "application/json"
    };
    for (const [key, value] of Object.entries(req.headers)) {
      if (["host", "connection", "content-length", "cookie", "origin", "referer", "accept-encoding"].includes(key.toLowerCase())) {
        continue;
      }
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
    const hasBody = !["GET", "HEAD"].includes(req.method) && req.body && Object.keys(req.body).length > 0;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : void 0
    });
    const bodyText = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection", "content-security-policy", "access-control-allow-origin"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(bodyText);
  } catch (err) {
    console.error("[Auth Proxy Error]:", err);
    res.status(500).json({ error: "Auth Proxy failed", message: err.message });
  }
});
app.post("/api/reset-password", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { phone, newPassword, username } = req.body;
    if (!phone || !newPassword || !username) {
      return res.status(400).json({ error: "Missing phone, newPassword, or username" });
    }
    const formattedPhone = `+880 ${phone}`;
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
      return res.status(400).json({ error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u098F\u09AC\u0982 \u09AB\u09CB\u09A8 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0 \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE!" });
    }
    const userId = userDoc.id;
    console.log(`Attempting to update password for user ID: ${userId}`);
    let userRec;
    try {
      userRec = await adminApp.auth().getUser(userId);
      console.log(`User found in Auth: ${userId}, Email: ${userRec.email}`);
      await adminApp.auth().updateUser(userId, {
        password: newPassword
      });
      await adminApp.auth().revokeRefreshTokens(userId);
      await usersRef.doc(userId).update({
        password: newPassword
      });
      console.log(`Password updated in both Auth and Firestore for user ID: ${userId}`);
    } catch (e) {
      console.error(`Error updating user: ${e.message}`);
      throw e;
    }
    res.json({ success: true, message: "Password updated successfully!", email: userRec?.email });
  } catch (err) {
    console.error("Password reset error:", err);
    console.error("Error stack:", err.stack);
    if (err.message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return res.status(500).json({ error: "\u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE\u099F\u09BF \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u0995\u09B0\u09A4\u09C7 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A5\u09C7\u0995\u09C7 Service Account Key \u099F\u09BF \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    res.status(500).json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u099A\u09CD\u099B\u09C7\u0964 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964" });
  }
});
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
  } catch (err) {
    console.error("Username update error:", err);
    res.status(500).json({ error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7: " + err.message });
  }
});
var TX_STORE_FILE = import_path2.default.join(process.cwd(), "data", "transactions_store.json");
var USERS_STORE_FILE = import_path2.default.join(process.cwd(), "data", "local_users_store.json");
function getLocalUsersStore() {
  try {
    if (import_fs2.default.existsSync(USERS_STORE_FILE)) {
      return JSON.parse(import_fs2.default.readFileSync(USERS_STORE_FILE, "utf8")) || {};
    }
  } catch (e) {
  }
  return {};
}
function getLocalUserBalance(uidOrUsername) {
  if (!uidOrUsername) return 777;
  const store = getLocalUsersStore();
  const key = uidOrUsername.toLowerCase();
  const user = store[uidOrUsername] || store[key];
  if (user && user.balance !== void 0) {
    return parseFloat(String(user.balance).replace(/,/g, "")) || 0;
  }
  const track = onlineUsersTracker.get(uidOrUsername);
  if (track && track.balance !== void 0) {
    return parseFloat(String(track.balance).replace(/,/g, "")) || 0;
  }
  return 777;
}
function updateLocalUserBalance(uidOrUsername, newBalance, amountAdded) {
  if (!uidOrUsername) return null;
  const store = getLocalUsersStore();
  const userKey = uidOrUsername.toLowerCase();
  const existing = store[uidOrUsername] || store[userKey] || { uid: uidOrUsername, username: uidOrUsername, balance: "777.00" };
  const numBal = typeof newBalance === "number" ? newBalance : parseFloat(String(newBalance).replace(/,/g, ""));
  const strBal = numBal.toFixed(2);
  existing.balance = strBal;
  existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (amountAdded && amountAdded > 0) {
    existing.totalDeposited = Number(existing.totalDeposited || 0) + amountAdded;
    existing.approvedDepositsCount = Number(existing.approvedDepositsCount || 0) + 1;
  }
  const realUid = existing.uid || existing.id || uidOrUsername;
  store[realUid] = existing;
  if (existing.username) store[existing.username.toLowerCase()] = existing;
  try {
    import_fs2.default.writeFileSync(USERS_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
  }
  const track = onlineUsersTracker.get(realUid) || onlineUsersTracker.get(uidOrUsername);
  if (track) {
    track.balance = strBal;
    onlineUsersTracker.set(realUid, track);
  }
  const cached = cachedUsersList.find((u) => u.id === realUid || u.uid === realUid || u.username?.toLowerCase() === userKey);
  if (cached) {
    cached.balance = strBal;
  }
  return existing;
}
function getLocalTransactions() {
  try {
    if (import_fs2.default.existsSync(TX_STORE_FILE)) {
      return JSON.parse(import_fs2.default.readFileSync(TX_STORE_FILE, "utf8")) || [];
    }
  } catch (e) {
  }
  return [];
}
function saveLocalTransaction(tx) {
  try {
    const list = getLocalTransactions();
    if (tx.transactionId && String(tx.transactionId).startsWith("ProPay-")) {
      tx.transactionId = String(tx.transactionId).replace(/^ProPay-/i, "");
    }
    if (tx.order_no && String(tx.order_no).startsWith("ProPay-")) {
      tx.order_no = String(tx.order_no).replace(/^ProPay-/i, "");
    }
    if (tx.id && String(tx.id).startsWith("ProPay-")) {
      tx.id = String(tx.id).replace(/^ProPay-/i, "");
    }
    const docKey = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || tx.timestamp + "_" + tx.amount;
    const idx = list.findIndex((item) => {
      const k = item.id || item.order_no || item.depositNo || item.withdrawNo || item.timestamp + "_" + item.amount;
      return k === docKey || tx.order_no && item.order_no === tx.order_no || tx.id && item.id === tx.id;
    });
    if (idx >= 0) {
      const existing = list[idx];
      const isApproved = existing.status === "approved" || existing.status === "success" || existing.status === 1 || existing.credited === true || tx.status === "approved" || tx.status === "success" || tx.status === 1 || tx.credited === true;
      const isRejected = !isApproved && (existing.status === "rejected" || existing.status === "cancelled" || existing.status === "failed" || existing.status === 2 || tx.status === "rejected" || tx.status === "cancelled" || tx.status === "failed" || tx.status === 2);
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
        trxSubmitted: Boolean(tx.trxSubmitted || existing.trxSubmitted || finalTxId && !String(finalTxId).startsWith("ORD") && String(finalTxId).length >= 6),
        status: isApproved ? "approved" : isRejected ? "cancelled" : tx.status || existing.status || "pending",
        credited: isApproved ? true : tx.credited || existing.credited || false,
        createdAt: existing.createdAt || tx.createdAt || existing.timestamp || tx.timestamp,
        timestamp: existing.timestamp || tx.timestamp || existing.createdAt || tx.createdAt,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      const initialTxId = tx.transactionId;
      const hasRealTrx = Boolean(initialTxId && !String(initialTxId).startsWith("ORD") && String(initialTxId).length >= 6);
      const creationIso = tx.createdAt || tx.timestamp || (function() {
        const m = String(tx.id || tx.order_no || "").match(/ORD(\d{10,14})/i);
        return m ? new Date(parseInt(m[1], 10)).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      })();
      list.unshift({
        ...tx,
        trxSubmitted: Boolean(tx.trxSubmitted || hasRealTrx),
        createdAt: creationIso,
        timestamp: tx.timestamp || creationIso
      });
    }
    const trimmed = list.slice(0, 1e3);
    import_fs2.default.writeFileSync(TX_STORE_FILE, JSON.stringify(trimmed, null, 2), "utf8");
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
      import_fs2.default.writeFileSync(TX_STORE_FILE, JSON.stringify(localList, null, 2), "utf8");
    }
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    const db = adminApp.firestore();
    const depSnap = await db.collection("deposits").where("username", "==", "unknown").limit(10).get();
    for (const dDoc of depSnap.docs) {
      const dData = dDoc.data();
      const uName = dData.uid && dData.uid !== "unknown" ? dData.uid : "User";
      await dDoc.ref.update({ username: uName }).catch(() => {
      });
    }
  } catch (err) {
    if (err?.code === 8 || err?.message?.includes("Quota exceeded")) {
      return;
    }
    console.warn("fixUnknownUsernamesInDb status:", err?.message || err);
  }
}
setTimeout(() => {
  fixUnknownUsernamesInDb();
}, 3e3);
app.post("/api/record-transaction", async (req, res) => {
  try {
    let tx = req.body;
    if (typeof tx === "string") {
      try {
        tx = JSON.parse(tx);
      } catch (e) {
      }
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
    const docId = safeTx.id || safeTx.order_no || safeTx.depositNo || safeTx.withdrawNo || "tx_" + Date.now();
    safeTx.id = String(docId);
    safeTx.order_no = safeTx.order_no || String(docId);
    safeTx.transactionId = safeTx.transactionId || safeTx.order_no || String(docId);
    safeTx.timestamp = safeTx.timestamp || safeTx.createdAt || (/* @__PURE__ */ new Date()).toISOString();
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
    if (safeTx.type === "deposit") {
      const localList = getLocalTransactions();
      const existing = localList.find((item) => item.id === docId || item.order_no === docId);
      const reqStatus = String(safeTx.status || "").toLowerCase();
      if (reqStatus === "cancelled" || reqStatus === "rejected" || reqStatus === "failed") {
        safeTx.status = "cancelled";
        safeTx.cancelled = true;
      } else if (existing && existing.status === "approved") {
        safeTx.status = "approved";
        safeTx.credited = true;
      } else {
        safeTx.status = "pending";
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
            ]).catch(() => {
            });
          } else if (safeTx.type === "withdraw") {
            await Promise.race([
              db.collection("withdrawals").doc(String(docId)).set(safeTx, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
            ]).catch(() => {
            });
          }
          await Promise.race([
            db.collection("transactions").doc(String(docId)).set(safeTx, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
          ]).catch(() => {
          });
        }
      } catch (fbErr) {
      }
    })();
    return res.json({ success: true, status: safeTx.status, id: docId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/submit-trxid", async (req, res) => {
  try {
    const { order_no, transactionId, senderNumber, uid, username, amount, method } = req.body || {};
    const cleanOrderNo = String(order_no || "").replace(/^ProPay-/i, "").trim();
    const cleanTrxId = String(transactionId || "").replace(/^ProPay-/i, "").trim();
    if (!cleanOrderNo || !cleanTrxId) {
      return res.status(400).json({ success: false, error: "Missing order_no or transactionId" });
    }
    const localList = getLocalTransactions();
    const idx = localList.findIndex((item) => item.id === cleanOrderNo || item.order_no === cleanOrderNo || item.depositNo === cleanOrderNo);
    const existing = idx >= 0 ? localList[idx] : {};
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
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
      status: existing.status === "approved" || existing.status === "success" ? "approved" : "pending",
      submittedAt: nowIso,
      updatedAt: nowIso
    };
    saveLocalTransaction(updatedDep);
    console.log(`[SUBMIT-TRXID] Order ${cleanOrderNo} updated with TrxID: ${cleanTrxId} for user ${updatedDep.username}`);
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).set(updatedDep, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => {
        });
        await Promise.race([
          db.collection("transactions").doc(cleanOrderNo).set(updatedDep, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => {
        });
      }
    } catch (e) {
    }
    return res.json({ success: true, order_no: cleanOrderNo, transactionId: cleanTrxId, deposit: updatedDep });
  } catch (err) {
    console.error("[SUBMIT-TRXID ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/cancel-transaction", async (req, res) => {
  try {
    const { order_no, id, uid } = req.body || {};
    const targetId = String(order_no || id || "").replace(/^ProPay-/i, "").trim();
    if (!targetId) {
      return res.status(400).json({ error: "Missing order_no or id" });
    }
    const localList = getLocalTransactions();
    let modified = false;
    for (const tx of localList) {
      const txId = String(tx.id || tx.order_no || tx.transactionId || "").replace(/^ProPay-/i, "");
      if (txId === targetId || tx.id === targetId || tx.order_no === targetId) {
        if (tx.status !== "approved" && tx.status !== "success" && tx.credited !== true) {
          tx.status = "cancelled";
          tx.cancelled = true;
          tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          modified = true;
        }
      }
    }
    if (modified) {
      try {
        import_fs2.default.writeFileSync(TX_STORE_FILE, JSON.stringify(localList, null, 2), "utf8");
      } catch (e) {
      }
    }
    (async () => {
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          const cancelPayload = { status: "cancelled", cancelled: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          await Promise.allSettled([
            db.collection("deposits").doc(targetId).set(cancelPayload, { merge: true }),
            db.collection("transactions").doc(targetId).set(cancelPayload, { merge: true }),
            uid ? db.collection("users").doc(uid).collection("history").doc(targetId).set(cancelPayload, { merge: true }) : Promise.resolve()
          ]);
        }
      } catch (fbErr) {
      }
    })();
    return res.json({ success: true, status: "cancelled", id: targetId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/admin/all-withdrawals", async (req, res) => {
  try {
    const localList = getLocalTransactions().filter((tx) => tx.type === "withdraw" || tx.withdrawNo || tx.order_no && String(tx.order_no).startsWith("WTH"));
    let firestoreList = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        firestoreList = await getFirestoreWithdrawalsSafe(adminApp);
      }
    } catch (fbErr) {
    }
    const map = /* @__PURE__ */ new Map();
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
          status: isApproved ? "approved" : isRejected ? "cancelled" : item.status || existing.status || "pending"
        });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return res.json({ withdrawals: merged });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/admin/all-deposits", async (req, res) => {
  try {
    const localList = getLocalTransactions().filter((tx) => tx.type === "deposit" || !tx.type && !tx.withdrawNo || tx.depositNo || tx.gateway || tx.order_no && !tx.withdrawNo);
    let firestoreList = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        firestoreList = await getFirestoreDepositsSafe(adminApp);
      }
    } catch (e) {
    }
    const map = /* @__PURE__ */ new Map();
    for (const item of [...firestoreList, ...localList]) {
      const orderNo = item.order_no || item.id || item.depositNo || item.serialNo || item.doc_id;
      if (!orderNo) continue;
      if (String(item.username || "").toLowerCase() === "sohel168" || String(orderNo).includes("1791043130093") || String(orderNo).includes("1791048421264")) {
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
        item.trxSubmitted || existing.trxSubmitted || realTxId && realTxId.length >= 6
      );
      const isApproved = item.status === "approved" || existing.status === "approved" || item.status === "success" || existing.status === "success" || Boolean(item.credited || existing.credited || item.balanceCredited || existing.balanceCredited);
      const isRejected = !isApproved && (item.status === "rejected" || existing.status === "rejected" || item.status === "cancelled" || existing.status === "cancelled");
      const finalStatus = isApproved ? "approved" : isRejected ? "cancelled" : item.status || existing.status || "pending";
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
    const deposits = Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.submittedAt || a.timestamp || a.createdAt || 0).getTime();
      const tb = new Date(b.submittedAt || b.timestamp || b.createdAt || 0).getTime();
      return tb - ta;
    });
    return res.json({ success: true, deposits });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
var onlineUsersTracker = /* @__PURE__ */ new Map();
function getOnlineUsersCount() {
  const now = Date.now();
  let count = 0;
  for (const [uid, user] of onlineUsersTracker.entries()) {
    if (user.isOnline && now - user.lastActiveTime < 15e4) {
      count++;
    } else if (now - user.lastActiveTime >= 3e5) {
      onlineUsersTracker.delete(uid);
    }
  }
  return count;
}
app.post("/api/register-user", async (req, res) => {
  try {
    const { username, password, phone, deviceId, deviceInfo, referralCode, lastIp } = req.body || {};
    if (!username || !password || !phone) {
      return res.status(400).json({ success: false, error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE, \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u098F\u09AC\u0982 \u09AB\u09CB\u09A8 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0 \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanPhone = String(phone).replace(/\D/g, "");
    let stdPhone = cleanPhone;
    if (stdPhone.length === 10 && stdPhone.startsWith("1")) {
      stdPhone = "0" + stdPhone;
    }
    if (stdPhone.length !== 11 || !/^01[3-9]\d{8}$/.test(stdPhone)) {
      return res.status(400).json({ success: false, error: "\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09E7\u09E7 \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0 \u09A6\u09BF\u09A8 (\u09AF\u09C7\u09AE\u09A8: 01XXXXXXXXX)" });
    }
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "\u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
    const db = adminApp.firestore();
    const auth = adminApp.auth();
    const email = `${cleanUsername.toLowerCase().replace(/\s+/g, "")}@sn777.com`;
    try {
      const phoneSnap = await db.collection("users").where("phone", "in", [stdPhone, "+880 " + stdPhone, "+880" + stdPhone, stdPhone.slice(1)]).limit(1).get();
      if (!phoneSnap.empty) {
        return res.status(400).json({ success: false, error: "\u098F\u0987 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7! \u098F\u0995\u099F\u09BF \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0\u09C7 \u098F\u0995\u09AC\u09BE\u09B0\u0987 \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09BE \u09AF\u09BE\u09AC\u09C7\u0964" });
      }
    } catch (e) {
    }
    try {
      const userSnap = await db.collection("users").where("username", "==", cleanUsername).limit(1).get();
      if (!userSnap.empty) {
        return res.status(400).json({ success: false, error: "\u098F\u0987 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
    } catch (e) {
    }
    let uid = "";
    try {
      const newAuthUser = await auth.createUser({
        email,
        password: cleanPassword,
        displayName: cleanUsername
      });
      uid = newAuthUser.uid;
    } catch (authErr) {
      if (authErr.code === "auth/email-already-exists") {
        try {
          const existingAuth = await auth.getUserByEmail(email);
          if (existingAuth) {
            const existingDoc = await db.collection("users").doc(existingAuth.uid).get();
            if (!existingDoc.exists || !existingDoc.data()?.username || existingDoc.data()?.username === "User") {
              uid = existingAuth.uid;
              await auth.updateUser(uid, { password: cleanPassword }).catch(() => {
              });
            } else {
              return res.status(400).json({ success: false, error: "\u098F\u0987 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964" });
            }
          }
        } catch (e) {
          return res.status(400).json({ success: false, error: "\u098F\u0987 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964" });
        }
      } else {
        return res.status(400).json({ success: false, error: authErr.message || "\u09B0\u09C7\u099C\u09BF\u09B8\u09CD\u099F\u09CD\u09B0\u09C7\u09B6\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
      }
    }
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
          }, { merge: true }).catch(() => {
          });
        }
      } catch (e) {
      }
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const nowMs = Date.now();
    const inviteCode = "sn_" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const userProfile = {
      name: cleanUsername,
      username: cleanUsername,
      email,
      phone: stdPhone,
      password: cleanPassword,
      birthday: "\u09E7\u09EF\u09EF\u09EE/\u09E6\u09E7/\u09E6\u09E7",
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
      lastIp: lastIp || req.headers["x-forwarded-for"] || req.ip || "",
      lastActive: nowIso,
      lastActiveTime: nowMs,
      isOnline: true
    };
    await db.collection("users").doc(uid).set(userProfile, { merge: true });
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
    cachedUsersList = [{ id: uid, uid, ...userProfile }, ...cachedUsersList.filter((u) => u.id !== uid)];
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
  } catch (err) {
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
      ...deviceId ? { deviceId } : {},
      ...deviceInfo ? { deviceInfo } : {},
      ...phone ? { phone } : {},
      ...balance !== void 0 ? { balance } : {}
    });
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const userUpdate = {
        isOnline: online,
        lastActive: new Date(now).toISOString(),
        lastActiveTime: now,
        ...deviceInfo ? { deviceInfo } : {},
        ...deviceId ? { deviceId } : {}
      };
      adminApp.firestore().collection("users").doc(uid).set(userUpdate, { merge: true }).catch(() => {
      });
    }
    return res.json({
      success: true,
      uid,
      isOnline: online,
      onlineCount: getOnlineUsersCount()
    });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});
var cachedUsersList = [];
var lastUsersFetch = 0;
app.get("/api/admin/all-users", async (req, res) => {
  try {
    const now = Date.now();
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.json({ success: true, users: cachedUsersList, onlineCount: getOnlineUsersCount() });
    }
    if (now - lastUsersFetch > 3e3 || cachedUsersList.length === 0) {
      if (now >= firestoreQuotaExceededUntil) {
        try {
          const snap = await Promise.race([
            adminApp.firestore().collection("users").limit(500).get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 6e3))
          ]);
          if (snap && snap.docs) {
            cachedUsersList = snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
            lastUsersFetch = now;
          }
        } catch (err) {
          if (err?.message?.includes("Quota exceeded") || err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
            firestoreQuotaExceededUntil = Date.now() + 6e4;
          }
        }
      }
    }
    const usersMap = /* @__PURE__ */ new Map();
    cachedUsersList.forEach((u) => usersMap.set(u.id || u.uid, { ...u }));
    const localStore = getLocalUsersStore();
    for (const [k, v] of Object.entries(localStore)) {
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
    const mergedUsers = Array.from(usersMap.values()).map((u) => {
      const track = onlineUsersTracker.get(u.id || u.uid);
      let lastActiveTime = u.lastActiveTime;
      if (!lastActiveTime && u.lastActive) {
        lastActiveTime = u.lastActive.toDate ? u.lastActive.toDate().getTime() : new Date(u.lastActive).getTime();
      }
      if (track && track.lastActiveTime > (lastActiveTime || 0)) {
        lastActiveTime = track.lastActiveTime;
      }
      const isOnline = track && track.isOnline && now - track.lastActiveTime < 15e4 || u.isOnline !== false && lastActiveTime && now - lastActiveTime < 15e4;
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
        balance: u.balance !== void 0 ? u.balance : "777.00",
        phone: u.phone || track?.phone || "",
        lastActiveTime: lastActiveTime || 0,
        isOnline: !!isOnline
      };
    });
    mergedUsers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const tA = a.registrationDate ? new Date(a.registrationDate).getTime() : a.lastActiveTime || 0;
      const tB = b.registrationDate ? new Date(b.registrationDate).getTime() : b.lastActiveTime || 0;
      return tB - tA;
    });
    return res.json({
      success: true,
      users: mergedUsers,
      total: mergedUsers.length,
      onlineCount: mergedUsers.filter((u) => u.isOnline).length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/user-transactions", async (req, res) => {
  try {
    const uid = String(req.query.uid || "").trim();
    const username = String(req.query.username || "").trim();
    const phone = String(req.query.phone || "").trim();
    if (!uid && !username && !phone) return res.status(400).json({ error: "Missing uid or username" });
    const localList = getLocalTransactions().filter((t) => {
      if (uid && t.uid === uid) return true;
      if (username && t.username && t.username.toLowerCase() === username.toLowerCase()) return true;
      if (phone && (t.phone === phone || t.userPhone === phone || t.accountNumber === phone)) return true;
      return false;
    });
    let firestoreList = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const queries = [];
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
          new Promise((resolve) => setTimeout(() => resolve([]), 800))
        ]).catch(() => []);
        for (const snap of results) {
          if (snap && snap.docs) {
            snap.docs.forEach((d) => {
              const data = d.data();
              const isWth = data.type === "withdraw" || !!data.withdrawNo;
              const isDep = !isWth && (data.type === "deposit" || !!data.depositNo || String(d.id).startsWith("ORD") || String(d.id).startsWith("dep"));
              const safeExtractIso = (val) => {
                if (!val) return null;
                if (typeof val === "object" && (val.seconds || val._seconds)) {
                  return new Date((val.seconds || val._seconds) * 1e3).toISOString();
                }
                if (typeof val === "string" || typeof val === "number") {
                  const dt = new Date(val);
                  if (!isNaN(dt.getTime())) return dt.toISOString();
                }
                return null;
              };
              const ordMatch = String(d.id || data.order_no || "").match(/ORD(\d{10,14})/i);
              const ordIso = ordMatch ? new Date(parseInt(ordMatch[1], 10)).toISOString() : null;
              const realCreationIso = safeExtractIso(data.createdAt) || safeExtractIso(data.timestamp) || ordIso || (/* @__PURE__ */ new Date()).toISOString();
              firestoreList.push({
                ...data,
                id: d.id,
                type: isWth ? "withdraw" : isDep ? "deposit" : data.type || "deposit",
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
    } catch (fbErr) {
      console.warn("Error reading from firestore collections:", fbErr);
    }
    const map = /* @__PURE__ */ new Map();
    for (const item of [...firestoreList, ...localList]) {
      if (username.toLowerCase() === "sohel168" && item.type === "deposit" || String(item.id || item.order_no || "").includes("1791043130093") || String(item.id || item.order_no || "").includes("1791048421264")) {
        continue;
      }
      const key = String(item.id || item.order_no || item.depositNo || item.withdrawNo || item.timestamp + "_" + item.amount).replace(/^ProPay-/i, "");
      const cleanTxId = String(item.transactionId || item.order_no || key).replace(/^ProPay-/i, "");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, id: key, transactionId: cleanTxId });
      } else {
        const isRejected = existing.status === "rejected" || existing.status === "cancelled" || existing.status === "failed" || existing.status === 2 || item.status === "rejected" || item.status === "cancelled" || item.status === "failed" || item.status === 2 || key.includes("1791043130093");
        const isApproved = !isRejected && (existing.status === "approved" || existing.status === "success" || existing.status === 1 || existing.credited === true || item.status === "approved" || item.status === "success" || item.status === 1 || item.credited === true);
        const timeExisting = getTxCreationTime(existing);
        const timeItem = getTxCreationTime(item);
        const earliestTime = timeExisting > 0 && timeItem > 0 ? Math.min(timeExisting, timeItem) : timeExisting || timeItem || Date.now();
        const earliestIso = new Date(earliestTime).toISOString();
        map.set(key, {
          ...existing,
          ...item,
          id: key,
          transactionId: cleanTxId,
          createdAt: existing.createdAt || item.createdAt || earliestIso,
          timestamp: existing.timestamp || item.timestamp || earliestIso,
          status: isApproved ? "approved" : isRejected ? "cancelled" : item.status || existing.status || "pending",
          credited: isApproved ? true : item.credited || existing.credited || false
        });
      }
    }
    const getTxCreationTime = (t) => {
      if (!t) return 0;
      const idStr = String(t.id || t.order_no || t.orderId || t.depositNo || t.withdrawNo || "");
      const m = idStr.match(/ORD(\d{10,14})/i);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > 16e11 && num < 25e11) return num;
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
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var BANK_ACCOUNTS_FILE = import_path2.default.join(appDir, "data", "bank_accounts.json");
function getLocalBankAccounts() {
  try {
    if (!import_fs2.default.existsSync(import_path2.default.join(appDir, "data"))) {
      import_fs2.default.mkdirSync(import_path2.default.join(appDir, "data"), { recursive: true });
    }
    if (import_fs2.default.existsSync(BANK_ACCOUNTS_FILE)) {
      return JSON.parse(import_fs2.default.readFileSync(BANK_ACCOUNTS_FILE, "utf8")) || {};
    }
  } catch (e) {
    console.error("Error reading BANK_ACCOUNTS_FILE:", e);
  }
  return {};
}
function saveLocalBankAccounts(data) {
  try {
    if (!import_fs2.default.existsSync(import_path2.default.join(appDir, "data"))) {
      import_fs2.default.mkdirSync(import_path2.default.join(appDir, "data"), { recursive: true });
    }
    import_fs2.default.writeFileSync(BANK_ACCOUNTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving BANK_ACCOUNTS_FILE:", e);
  }
}
app.get("/api/user-bank-accounts", async (req, res) => {
  try {
    const uid = String(req.query.uid || req.query.userId || "").trim();
    const username = String(req.query.username || "").trim();
    const phone = String(req.query.phone || "").trim();
    const localMap = getLocalBankAccounts();
    let accounts = [];
    if (uid && localMap[uid]) accounts = localMap[uid];
    else if (username && localMap[username]) accounts = localMap[username];
    else if (phone && localMap[phone]) accounts = localMap[phone];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        let firestoreAccounts = [];
        if (uid) {
          const userDoc = await Promise.race([
            db.collection("users").doc(uid).get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (userDoc && userDoc.exists && userDoc.data()?.bankAccounts) {
            firestoreAccounts = userDoc.data()?.bankAccounts || [];
          }
        }
        if (firestoreAccounts.length === 0 && username) {
          const snap = await Promise.race([
            db.collection("users").where("username", "==", username).limit(1).get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (snap && !snap.empty) {
            firestoreAccounts = snap.docs[0].data()?.bankAccounts || [];
          }
        }
        if (firestoreAccounts.length === 0 && (uid || username)) {
          const bankDoc = await Promise.race([
            db.collection("user_bank_accounts").doc(uid || username).get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 800))
          ]).catch(() => null);
          if (bankDoc && bankDoc.exists && bankDoc.data()?.accounts) {
            firestoreAccounts = bankDoc.data()?.accounts || [];
          }
        }
        if (Array.isArray(firestoreAccounts) && firestoreAccounts.length > 0) {
          const map = {};
          accounts.forEach((a) => {
            if (a && a.id) map[a.id] = a;
          });
          firestoreAccounts.forEach((a) => {
            if (a && a.id) map[a.id] = a;
          });
          accounts = Object.values(map);
          if (uid) localMap[uid] = accounts;
          if (username) localMap[username] = accounts;
          if (phone) localMap[phone] = accounts;
          saveLocalBankAccounts(localMap);
        }
      }
    } catch (e) {
      console.warn("Firestore bank account fetch error:", e?.message);
    }
    return res.json({ success: true, accounts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/user-bank-accounts", async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
      }
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
    let currentAccounts = localMap[key] || [];
    if (incomingAccounts.length > 0) {
      currentAccounts = incomingAccounts;
    } else if (action === "delete" && deletedId) {
      currentAccounts = currentAccounts.filter((a) => a.id !== deletedId);
    } else if (newAccount && newAccount.id) {
      currentAccounts = [newAccount, ...currentAccounts.filter((a) => a.id !== newAccount.id && a.methodId !== newAccount.methodId)];
    }
    if (uid) localMap[uid] = currentAccounts;
    if (username) localMap[username] = currentAccounts;
    if (phone) localMap[phone] = currentAccounts;
    localMap[key] = currentAccounts;
    saveLocalBankAccounts(localMap);
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        if (uid) {
          db.collection("users").doc(uid).set({ bankAccounts: currentAccounts }, { merge: true }).catch(() => {
          });
          db.collection("user_bank_accounts").doc(uid).set({ accounts: currentAccounts, username, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => {
          });
        }
        if (username) {
          db.collection("users").where("username", "==", username).limit(1).get().then((snap) => {
            if (snap && !snap.empty) {
              snap.docs[0].ref.set({ bankAccounts: currentAccounts }, { merge: true }).catch(() => {
              });
            }
          }).catch(() => {
          });
          db.collection("user_bank_accounts").doc(username).set({ accounts: currentAccounts, uid, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => {
          });
        }
      }
    } catch (e) {
      console.warn("Firestore bank account save error:", e?.message);
    }
    return res.json({ success: true, accounts: currentAccounts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/update-auth", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername, newPassword, newPhone } = req.body;
    console.log(`DEBUG: /api/update-auth request body:`, { uid, newUsername, newPassword, newPhone });
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    const authUpdate = {};
    const firestoreUpdate = {};
    if (newPassword) {
      console.log(`DEBUG: New password length: ${newPassword.length}`);
    }
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
      const _uName = newUsername.trim();
      const _uLen = _uName.length;
      const _uUnique = new Set(_uName.toLowerCase().split("")).size;
      const _hasRep = /(.)\1{2,}/i.test(_uName);
      const _isPlaceholder = /^(user|guest|unknown|random|test|admin|null|undefined|demo|player)/i.test(_uName);
      const _hasConsonantsBlock = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(_uName);
      const _hasVowel = /[aeiouyAEIOUY\u0980-\u09FF]/.test(_uName);
      const _validChars = /^[a-zA-Z\u0980-\u09FF][a-zA-Z0-9_\u0980-\u09FF]{3,14}$/.test(_uName);
      if (!_validChars || _hasRep || _isPlaceholder || _hasConsonantsBlock || !_hasVowel || _uLen >= 4 && _uUnique < 3) {
        return res.status(400).json({ error: "\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BF \u09B8\u09C1\u09A8\u09CD\u09A6\u09B0 \u098F\u0995\u099F\u09BF \u09A8\u09BE\u09AE \u09A6\u09BF\u09A8 \u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u0989\u099C\u09BE\u09B0 \u09A8\u09BE\u09AE\u099F\u09BF \u0997\u09CD\u09B0\u09B9\u09A3\u09AF\u09CB\u0997\u09CD\u09AF \u09A8\u09BE \u09A6\u09AF\u09BC\u09BE \u0995\u09B0\u09C7 \u09B8\u09C1\u09A8\u09CD\u09A6\u09B0 \u098F\u0995\u099F\u09BF \u0987\u0989\u099C\u09BE\u09B0 \u09A8\u09BE\u09AE \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8" });
      }
      authUpdate.email = `${newUsername.toLowerCase().replace(/\s+/g, "")}@sn777.com`;
      firestoreUpdate.username = newUsername;
      firestoreUpdate.email = authUpdate.email;
    }
    if (newPassword) {
      authUpdate.password = newPassword;
      firestoreUpdate.password = newPassword;
    }
    if (newPhone) {
      const cleanPhone = newPhone.toString().replace(/\s+/g, "");
      if (cleanPhone.length !== 11 || !/^\d+$/.test(cleanPhone)) {
        return res.status(400).json({ error: "\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09E7\u09E7 \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0 \u09A6\u09BF\u09A8!" });
      }
      const usersRef = db.collection("users");
      const phoneQuery = await usersRef.where("phone", "==", `+880 ${cleanPhone}`).get();
      if (!phoneQuery.empty) {
        const existingUser = phoneQuery.docs[0];
        if (existingUser.id !== uid) {
          return res.status(400).json({ error: "\u098F\u0987 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7!" });
        }
      }
      firestoreUpdate.phone = `+880 ${cleanPhone}`;
    }
    if (newPassword) {
      console.log(`DEBUG: Updating Auth password for user ${uid}`);
      let success = false;
      let lastError = null;
      for (let i = 0; i < 3; i++) {
        try {
          await adminApp.auth().updateUser(uid, { password: newPassword, disabled: false });
          success = true;
          break;
        } catch (authErr) {
          if (authErr.code === "auth/user-not-found") {
            console.log(`[update-auth] User not found in Firebase Auth. Re-creating auth record for uid: ${uid}`);
            const targetEmail = dbEmail || authUpdate.email || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, "")}@sn777.com`;
            try {
              await adminApp.auth().createUser({
                uid,
                email: targetEmail,
                password: newPassword,
                disabled: false
              });
              success = true;
              break;
            } catch (createErr) {
              if (createErr.code === "auth/email-already-exists") {
                console.log(`[update-auth] Email ${targetEmail} matches another user during creation. Cleaning up...`);
                try {
                  const conflictingUser = await adminApp.auth().getUserByEmail(targetEmail);
                  if (conflictingUser && conflictingUser.uid !== uid) {
                    await adminApp.auth().deleteUser(conflictingUser.uid);
                    await adminApp.auth().createUser({
                      uid,
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
          console.error(`DEBUG: Auth password update FAILED (attempt ${i + 1}) for user ${uid}:`, authErr);
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
      if (!success) {
        throw lastError;
      }
      await adminApp.auth().revokeRefreshTokens(uid);
      console.log(`DEBUG: Auth password updated successfully for user ${uid}`);
    }
    const otherAuthUpdate = { ...authUpdate };
    delete otherAuthUpdate.password;
    if (Object.keys(otherAuthUpdate).length > 0) {
      console.log(`DEBUG: Updating Auth for user ${uid} with data:`, otherAuthUpdate);
      try {
        await adminApp.auth().updateUser(uid, otherAuthUpdate);
      } catch (authErr) {
        if (authErr.code === "auth/user-not-found") {
          console.log(`[update-auth] User not found for other fields update. Re-creating auth record for uid: ${uid}`);
          const targetEmail = otherAuthUpdate.email || dbEmail || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, "")}@sn777.com`;
          const targetPassword = newPassword || (userDoc.exists ? userDoc.data()?.password : void 0) || "123456";
          await adminApp.auth().createUser({
            uid,
            email: targetEmail,
            password: targetPassword,
            disabled: false
          });
        } else if (authErr.code === "auth/email-already-exists") {
          console.log(`[update-auth] Email ${otherAuthUpdate.email} matches another user during update. Cleaning up conflicting user...`);
          try {
            const conflictingUser = await adminApp.auth().getUserByEmail(otherAuthUpdate.email);
            if (conflictingUser && conflictingUser.uid !== uid) {
              console.log(`[update-auth] Deleting conflicting Auth user with UID: ${conflictingUser.uid}`);
              await adminApp.auth().deleteUser(conflictingUser.uid);
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
    if (Object.keys(firestoreUpdate).length > 0 && userDoc.exists) {
      console.log(`DEBUG: Updating Firestore for user ${uid} with data:`, { ...firestoreUpdate, password: "***" });
      await userDocRef.update(firestoreUpdate);
      console.log(`DEBUG: Firestore updated successfully for user ${uid}.`);
    }
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "\u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7: " + err.message });
  }
});
var SN_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8936057718:AAHzK6X2GIvIe9qSncl53pfrUBFB-nUR4U8";
var SN_GROUP_ID = process.env.TELEGRAM_GROUP_ID || "-1003806717205";
var userRepliesStore = /* @__PURE__ */ new Map();
var sentMessageToUserMap = /* @__PURE__ */ new Map();
var globalTgOffset = 0;
var lastWebhookCheck = 0;
async function safeFetchJsonWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      const json = await response.json();
      if (json && json.ok) return json;
      if (attempt === maxRetries) return json || { ok: false, description: "Invalid response from Telegram API" };
    } catch (err) {
      if (attempt === maxRetries) {
        return { ok: false, description: err.message || "fetch failed" };
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return { ok: false, description: "Fetch failed after retries" };
}
function storeUserReply(targetKey, replyId, replyText, timeStr) {
  if (!targetKey) return;
  const normalizedKey = targetKey.trim().toLowerCase();
  if (!userRepliesStore.has(normalizedKey)) {
    userRepliesStore.set(normalizedKey, []);
  }
  const list = userRepliesStore.get(normalizedKey);
  if (!list.some((item) => item.id === replyId)) {
    list.push({ id: replyId, text: replyText, time: timeStr });
    if (list.length > 50) list.shift();
    console.log(`[TelegramChat] Stored admin reply for "${normalizedKey}": "${replyText}"`);
  }
}
async function pollTelegramUpdates() {
  try {
    const now = Date.now();
    if (now - lastWebhookCheck > 6e4) {
      lastWebhookCheck = now;
      safeFetchJsonWithRetry(`https://api.telegram.org/bot${SN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`, { method: "GET" }, 1).catch(() => {
      });
    }
    const url = `https://api.telegram.org/bot${SN_BOT_TOKEN}/getUpdates?offset=${globalTgOffset + 1}&timeout=2`;
    const res = await safeFetchJsonWithRetry(url, { method: "GET" }, 1).catch(() => null);
    if (res && !res.ok && res.error_code === 409) {
      await safeFetchJsonWithRetry(`https://api.telegram.org/bot${SN_BOT_TOKEN}/deleteWebhook`, { method: "GET" }, 1).catch(() => {
      });
      return;
    }
    if (res && res.ok && Array.isArray(res.result) && res.result.length > 0) {
      for (const update of res.result) {
        globalTgOffset = update.update_id;
        const msg = update.message;
        if (!msg || !msg.text) continue;
        const msgText = String(msg.text).trim();
        const timeStr = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        let matchedTarget = false;
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
  }
}
setInterval(pollTelegramUpdates, 2e3);
app.post("/api/send-telegram", import_express.default.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { name, userId, balance, deposit, message } = req.body;
    const cleanUser = String(userId || name || "Guest").trim();
    const cleanName = String(name || "User").trim();
    const payloadText = "\u{1F4E9} New Live Message\n\u{1F310} Site: Sn777.site\n\u{1F464} Name: " + cleanName + "\n\u{1F194} User ID: " + cleanUser + "\n\u{1F4B0} Balance: " + (balance || "\u09F30.00") + "\n\u{1F4B3} Total Deposit: " + (deposit || "\u09F30.00") + "\n----------------------------------\n\u{1F4AC} Message: " + (message || "").trim() + "\n\n\u{1F4A1} \u0989\u09A4\u09CD\u09A4\u09B0 \u09A6\u09C7\u0993\u09DF\u09BE\u09B0 \u0989\u09AA\u09BE\u09DF:\n\u09E7. \u098F\u0987 \u09AE\u09C7\u09B8\u09C7\u099C\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF Reply \u0995\u09B0\u09C1\u09A8\n\u09E8. \u0985\u09A5\u09AC\u09BE \u09B2\u09BF\u0996\u09C1\u09A8: " + cleanUser + ": \u0986\u09AA\u09A8\u09BE\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0";
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
        if (firstKey !== void 0) sentMessageToUserMap.delete(firstKey);
      }
      console.log(`[TelegramChat] Delivered message for ${cleanUser} (TG msg_id: ${msgId})`);
    } else {
      console.error("Telegram Send Status:", response);
    }
    return res.json({ success: true, delivered: !!(response && response.ok) });
  } catch (err) {
    return res.json({ success: true });
  }
});
app.post("/api/send-telegram-photo", import_express.default.json({ limit: "25mb" }), async (req, res) => {
  try {
    const { name, userId, balance, deposit, imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: "Missing image" });
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const captionText = "\u{1F5BC}\uFE0F New Image Attachment\n\u{1F310} Site: Sn777.site\n\u{1F464} Name: " + (name || "User") + "\n\u{1F194} User ID: " + (userId || "Guest") + "\n\u{1F4B0} Balance: " + (balance || "\u09F30.00") + "\n\u{1F4B3} Total Deposit: " + (deposit || "\u09F30.00");
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
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/telegram-replies", async (req, res) => {
  try {
    const rawId = String(req.query.userId || req.query.username || "").trim();
    if (!rawId) return res.json({ success: true, replies: [] });
    const key = rawId.toLowerCase();
    const list = userRepliesStore.get(key) || userRepliesStore.get(rawId) || [];
    return res.json({ success: true, replies: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/lookup-user", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return res.status(503).json({ error: "Database not available" });
    const rawQuery = String(req.query.q || req.query.username || req.query.uid || req.query.phone || "").trim();
    if (!rawQuery) return res.status(400).json({ error: "Missing query" });
    const db = adminApp.firestore();
    const auth = adminApp.auth();
    let userData = null;
    let userUid = "";
    try {
      const docSnap = await db.collection("users").doc(rawQuery).get();
      if (docSnap.exists) {
        userData = docSnap.data();
        userUid = docSnap.id;
      }
    } catch (e) {
    }
    if (!userData) {
      const candidateEmails = [
        rawQuery.includes("@") ? rawQuery : `${rawQuery.toLowerCase().replace(/\s+/g, "")}@sn777.com`,
        `m${rawQuery.toLowerCase().replace(/\s+/g, "")}@sn777.com`,
        `md${rawQuery.toLowerCase().replace(/\s+/g, "")}@sn777.com`,
        `${rawQuery.toLowerCase().replace(/[^a-z0-9]/g, "")}@sn777.com`
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
            } catch (errDoc) {
            }
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
                registrationDate: authUser.metadata.creationTime || (/* @__PURE__ */ new Date()).toISOString(),
                role: "user"
              };
              db.collection("users").doc(userUid).set(userData, { merge: true }).catch(() => {
              });
            }
            break;
          }
        } catch (e) {
        }
      }
    }
    if (!userData) {
      try {
        const snap = await db.collection("users").where("username", "==", rawQuery).limit(1).get();
        if (!snap.empty) {
          userData = snap.docs[0].data();
          userUid = snap.docs[0].id;
        }
      } catch (e) {
      }
    }
    if (!userData) {
      try {
        const snap = await db.collection("users").where("username", "==", rawQuery.toLowerCase()).limit(1).get();
        if (!snap.empty) {
          userData = snap.docs[0].data();
          userUid = snap.docs[0].id;
        }
      } catch (e) {
      }
    }
    if (!userData) {
      try {
        const list = await auth.listUsers(1e3);
        const cleanQ = rawQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matched = list.users.find((u) => {
          const email = (u.email || "").toLowerCase();
          const cleanEmail = email.split("@")[0];
          return cleanEmail === cleanQ || cleanEmail.includes(cleanQ) || cleanQ.includes(cleanEmail);
        });
        if (matched) {
          userUid = matched.uid;
          try {
            const docSnap = await db.collection("users").doc(matched.uid).get();
            if (docSnap.exists) {
              userData = docSnap.data();
            }
          } catch (e) {
          }
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
              registrationDate: matched.metadata.creationTime || (/* @__PURE__ */ new Date()).toISOString(),
              role: "user"
            };
            db.collection("users").doc(userUid).set(userData, { merge: true }).catch(() => {
            });
          }
        }
      } catch (e) {
      }
    }
    if (!userData) {
      return res.json({ success: false, error: "User not found" });
    }
    const numBal = parseFloat(String(userData.balance || "0").replace(/,/g, "")) || 0;
    const numDep = parseFloat(String(userData.totalDeposited || "0").replace(/,/g, "")) || 0;
    const cleanUName = userData.username && userData.username !== "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0" && userData.username !== "User" ? userData.username : userData.email ? userData.email.split("@")[0] : rawQuery;
    const cleanDisplayName = userData.name && userData.name !== "\u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BE\u09AE" && userData.name !== "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0" && userData.name !== "User" ? userData.name : cleanUName;
    return res.json({
      success: true,
      user: {
        uid: userUid,
        username: cleanUName,
        name: cleanDisplayName,
        phone: userData.phone || "",
        email: userData.email || "",
        balance: "\u09F3" + numBal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawBalance: numBal,
        deposit: "\u09F3" + numDep.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawDeposit: numDep,
        role: userData.role || "user"
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/debug-users", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const username = req.query.username;
    const uid = req.query.uid;
    let authUser = null;
    try {
      if (uid) {
        authUser = await adminApp.auth().getUser(uid);
      } else if (username) {
        authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, "")}@sn777.com`);
      } else {
        return res.json({ error: "provide username or uid" });
      }
    } catch (e) {
      authUser = { error: e.message };
    }
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
  } catch (e) {
    res.json({ error: e.message });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/debug-project", (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    res.json({ projectId: adminApp.app().options.projectId });
  } catch (e) {
    res.json({ error: e.message });
  }
});
app.get("/chat", (req, res) => {
  res.redirect("https://t.me/sn777top");
});
setInterval(() => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - System Keep-Alive: OK`);
}, 15 * 60 * 1e3);
async function approveAndCreditDeposit(orderNoInput, paidAmountOverride, reqUid, tradeNoParam, gatewayRawData) {
  const cleanOrderNo = String(orderNoInput || "").trim();
  if (!cleanOrderNo) return null;
  const localList = getLocalTransactions();
  const existingLocal = localList.find(
    (t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo || t.depositNo === cleanOrderNo || t.serialNo === cleanOrderNo || tradeNoParam && (t.tradeNo === tradeNoParam || t.id === tradeNoParam)
  );
  let depData = null;
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
  if (isGenericUid(candidateUid)) {
    const cachedOrder = paymentOrdersCache.get(cleanOrderNo);
    if (cachedOrder && !isGenericUid(cachedOrder.uid)) {
      candidateUid = cachedOrder.uid;
      if (!candidateUsername || isGenericUid(candidateUsername)) candidateUsername = cachedOrder.username;
      if (!phone) phone = cachedOrder.phone;
    }
  }
  if (isGenericUid(candidateUid) && gatewayRawData) {
    const retMsg = String(gatewayRawData.mch_return_msg || gatewayRawData.mchReturnMsg || "").trim();
    if (retMsg && !isGenericUid(retMsg) && retMsg !== "sn777_user") {
      candidateUid = retMsg;
    }
  }
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
          candidateUid = !isGenericUid(depData.uid) ? depData.uid : !isGenericUid(depData.user_id) ? depData.user_id : "";
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
  const alreadyCreditedToRealUser = existingLocal && existingLocal.balanceCredited === true && existingLocal.creditedUid && !isGenericUid(existingLocal.creditedUid) && existingLocal.creditedUid === candidateUid || depData && depData.balanceCredited === true && depData.creditedUid && !isGenericUid(depData.creditedUid) && depData.creditedUid === candidateUid;
  let targetUid = candidateUid;
  let updatedBalance = "";
  if (!alreadyCreditedToRealUser && amount > 0 && candidateUid && !isGenericUid(candidateUid)) {
    try {
      const curLocalBal = getLocalUserBalance(candidateUid);
      const newBal = (curLocalBal + amount).toFixed(2);
      updatedBalance = newBal;
      updateLocalUserBalance(candidateUid, newBal, amount);
      if (candidateUsername && candidateUsername !== candidateUid && !isGenericUid(candidateUsername)) {
        updateLocalUserBalance(candidateUsername, newBal, amount);
      }
      console.log(`[approveAndCreditDeposit] Successfully credited \u09F3${amount} to local user ${candidateUid}. New balance: \u09F3${newBal}`);
      let uData = null;
      if (defaultDb) {
        try {
          const snap = await Promise.race([
            defaultDb.collection("users").doc(candidateUid).get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 1500))
          ]).catch(() => null);
          if (snap && snap.exists) uData = snap.data();
        } catch (e) {
        }
      }
      if (!uData && db) {
        try {
          const snap = await Promise.race([
            db.collection("users").doc(candidateUid).get(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 1500))
          ]).catch(() => null);
          if (snap && snap.exists) uData = snap.data();
        } catch (e) {
        }
      }
      if (!uData) {
        uData = await firestoreRestGet("users", candidateUid, "(default)");
      }
      if (!uData) {
        uData = await firestoreRestGet("users", candidateUid, FS_DB_ID);
      }
      const curBal = uData ? parseFloat(String(uData.balance || "0").replace(/,/g, "")) || 0 : curLocalBal;
      const fsNewBal = (curBal + amount).toFixed(2);
      const curDep = uData ? parseFloat(String(uData.totalDeposited || uData.totalDeposit || uData.deposit || "0").replace(/,/g, "")) || 0 : 0;
      const curCount = uData ? Number(uData.approvedDepositsCount || 0) : 0;
      const userUpdatePayload = {
        balance: fsNewBal,
        userBalance: fsNewBal,
        mainBalance: fsNewBal,
        approvedDepositsCount: curCount + 1,
        totalDeposited: curDep + amount,
        totalDeposit: curDep + amount,
        deposit: curDep + amount,
        withdrawEnabled: curDep + amount >= 940 && curCount + 1 >= 2,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await Promise.allSettled([
        firestoreRestPatch("users", candidateUid, userUpdatePayload, "(default)"),
        firestoreRestPatch("users", candidateUid, userUpdatePayload, FS_DB_ID)
      ]);
      if (defaultDb) {
        defaultDb.collection("users").doc(candidateUid).set(userUpdatePayload, { merge: true }).catch(() => {
        });
      }
      if (db) {
        db.collection("users").doc(candidateUid).set(userUpdatePayload, { merge: true }).catch(() => {
        });
      }
      updatedBalance = fsNewBal;
      updateLocalUserBalance(candidateUid, fsNewBal, amount);
      if (candidateUsername) updateLocalUserBalance(candidateUsername, fsNewBal, amount);
      console.log(`[approveAndCreditDeposit] Synced to BOTH Firestore databases user ${candidateUid}. New bal: \u09F3${fsNewBal}`);
    } catch (uErr) {
      console.error("[approveAndCreditDeposit] Error updating user balance:", uErr);
    }
  }
  const finalUid = !isGenericUid(targetUid) ? targetUid : !isGenericUid(candidateUid) ? candidateUid : "";
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updatedLocal = {
    ...existingLocal || {},
    id: cleanOrderNo,
    order_no: cleanOrderNo,
    orderId: cleanOrderNo,
    depositNo: cleanOrderNo,
    serialNo: cleanOrderNo,
    uid: finalUid,
    username: candidateUsername || existingLocal?.username || "User",
    phone,
    amount,
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
    amount,
    finalCredit: amount,
    tradeNo: tradeNoParam || existingLocal?.tradeNo || "",
    approvedAt: nowIso,
    updatedAt: nowIso,
    ...finalUid && { uid: finalUid }
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
      ]).catch(() => {
      });
    }
    if (db) {
      Promise.allSettled([
        db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
        finalUid ? db.collection("users").doc(finalUid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }) : Promise.resolve()
      ]).catch(() => {
      });
    }
    console.log(`[approveAndCreditDeposit] Deposit ${cleanOrderNo} successfully marked approved across (default) and custom Firestore!`);
  } catch (syncErr) {
    console.warn("[approveAndCreditDeposit] Firestore sync error:", syncErr);
  }
  return updatedLocal;
}
async function reconcileUncreditedApprovedDeposits() {
  try {
    const localList = getLocalTransactions();
    const approvedUncredited = localList.filter(
      (t) => t.type === "deposit" && (t.status === "approved" || t.credited === true) && (t.balanceCredited !== true || isGenericUid(t.creditedUid) || isGenericUid(t.uid))
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
  } catch (err) {
    console.warn("[Reconciler] Error during deposit reconciliation:", err?.message || err);
  }
}
async function handleIncomingSmsPayload(payload) {
  const settings = getSmsSettings();
  if (!settings.enabled) {
    return { success: false, status: "disabled", message: "\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u0985\u099F\u09CB-\u09AD\u09C7\u09B0\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BF\u09B8 \u09B8\u09BE\u09AE\u09DF\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09AC\u09A8\u09CD\u09A7 \u0986\u099B\u09C7\u0964" };
  }
  const secret = payload.secret || payload.token || payload.apiKey || payload.key || "";
  if (settings.secretKey && secret && secret !== settings.secretKey) {
    return { success: false, status: "unauthorized", message: "\u09AD\u09C1\u09B2 \u09B8\u09BF\u0995\u09CD\u09B0\u09C7\u099F \u0995\u09BF (Invalid Secret Key)!" };
  }
  let rawMessage = String(payload.message || payload.body || payload.text || payload.msg || payload.sms || payload.content || "").trim();
  let senderHint = String(payload.sender || payload.from || payload.address || payload.provider || "").trim();
  if (!rawMessage && typeof payload === "string") {
    rawMessage = payload.trim();
  }
  let parsed = parseSms(rawMessage, senderHint);
  if ((!parsed || !parsed.trxId) && (payload.trxId || payload.transactionId || payload.order_no)) {
    const directTrx = String(payload.trxId || payload.transactionId || payload.order_no || "").trim().toUpperCase();
    const directAmt = parseFloat(String(payload.amount || payload.money || "0").replace(/,/g, ""));
    if (directTrx) {
      parsed = {
        provider: payload.provider || parsed?.provider || "unknown",
        trxId: directTrx,
        amount: directAmt > 0 ? directAmt : parsed?.amount || null,
        senderPhone: payload.senderPhone || payload.phone || parsed?.senderPhone || null,
        raw: rawMessage || `Direct: TrxID ${directTrx} Amount \u09F3${directAmt}`,
        senderHint,
        detectedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  if (!parsed || !parsed.trxId || !parsed.amount) {
    const logItem2 = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage || JSON.stringify(payload),
      sender: senderHint,
      provider: parsed?.provider || "unknown",
      trxId: parsed?.trxId || null,
      amount: parsed?.amount || null,
      senderPhone: parsed?.senderPhone || null,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      matched: false,
      autoApproved: false,
      status: "unparsed",
      note: "\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09A5\u09C7\u0995\u09C7 TrxID \u0985\u09A5\u09AC\u09BE \u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B6\u09A8\u09BE\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964"
    };
    saveSmsLog(logItem2);
    return {
      success: false,
      status: "unparsed",
      message: "\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09A5\u09C7\u0995\u09C7 TrxID \u0985\u09A5\u09AC\u09BE \u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B6\u09A8\u09BE\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09AC\u09BF\u0995\u09BE\u09B6/\u09A8\u0997\u09A6/\u09B0\u0995\u09C7\u099F \u09AE\u09C7\u09B8\u09C7\u099C \u09A6\u09BF\u09A8\u0964",
      parsed
    };
  }
  const cleanTrxId = parsed.trxId.toUpperCase().trim();
  const paidAmount = parsed.amount;
  const localList = getLocalTransactions();
  const alreadyApproved = localList.find(
    (t) => (String(t.transactionId || "").toUpperCase() === cleanTrxId || String(t.order_no || "").toUpperCase() === cleanTrxId) && (t.status === "approved" || t.credited === true)
  );
  if (alreadyApproved) {
    const logItem2 = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage,
      sender: senderHint,
      provider: parsed.provider,
      trxId: cleanTrxId,
      amount: paidAmount,
      senderPhone: parsed.senderPhone,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      matched: true,
      matchedOrderNo: alreadyApproved.order_no || alreadyApproved.id,
      matchedUid: alreadyApproved.uid,
      autoApproved: false,
      status: "already_used",
      note: "\u098F\u0987 TrxID \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7\u0987 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09CB\u0997 \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
    };
    saveSmsLog(logItem2);
    return {
      success: true,
      status: "already_used",
      message: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7\u0987 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u0993 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7\u0964",
      trxId: cleanTrxId,
      amount: paidAmount,
      order_no: alreadyApproved.order_no || alreadyApproved.id
    };
  }
  let pendingTx = localList.find(
    (t) => (t.status === "pending" || t.status === "processing") && (String(t.transactionId || "").toUpperCase() === cleanTrxId || String(t.order_no || "").toUpperCase() === cleanTrxId || String(t.id || "").toUpperCase() === cleanTrxId)
  );
  if (!pendingTx) {
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && Date.now() >= firestoreQuotaExceededUntil) {
        const db = adminApp.firestore();
        const snap = await Promise.race([
          db.collection("deposits").where("transactionId", "==", cleanTrxId).where("status", "==", "pending").limit(1).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (snap && !snap.empty) {
          pendingTx = snap.docs[0].data();
        }
      }
    } catch (dbErr) {
      console.warn("[handleIncomingSmsPayload] Firestore query warning:", dbErr);
    }
  }
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
      receivedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    claimPoolSms(cleanTrxId, targetOrderNo, uid);
    const logItem2 = {
      id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      rawText: rawMessage,
      sender: senderHint,
      provider: parsed.provider,
      trxId: cleanTrxId,
      amount: paidAmount,
      senderPhone: parsed.senderPhone,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      matched: true,
      matchedOrderNo: targetOrderNo,
      matchedUid: uid,
      autoApproved: true,
      status: "auto_approved",
      note: `\u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A8 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F #${targetOrderNo} (${pendingTx.username || uid}) \u098F\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AE\u09BF\u09B2\u09C7 \u0997\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09A4\u09BE\u09CE\u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u09F3${paidAmount} \u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!`
    };
    saveSmsLog(logItem2);
    return {
      success: true,
      status: "auto_approved",
      matched: true,
      autoApproved: true,
      order_no: targetOrderNo,
      amount: paidAmount,
      username: pendingTx.username,
      message: `\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F #${targetOrderNo} \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987 \u0993 \u0987\u0989\u099C\u09BE\u09B0 (${pendingTx.username || "User"}) \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09F3${paidAmount} \u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!`
    };
  }
  addToVerifiedPool({
    trxId: cleanTrxId,
    amount: paidAmount,
    provider: parsed.provider,
    senderPhone: parsed.senderPhone,
    rawText: rawMessage,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const logItem = {
    id: "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    rawText: rawMessage,
    sender: senderHint,
    provider: parsed.provider,
    trxId: cleanTrxId,
    amount: paidAmount,
    senderPhone: parsed.senderPhone,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    matched: false,
    autoApproved: false,
    status: "waiting_for_user",
    note: `\u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987\u09A1 \u09AA\u09C1\u09B2\u09C7 \u099C\u09AE\u09BE \u09B0\u09BE\u0996\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0987\u0989\u099C\u09BE\u09B0 \u098F\u0987 TrxID (${cleanTrxId}) \u09B8\u09BE\u09AC\u09AE\u09BF\u099F \u0995\u09B0\u09B2\u09C7\u0987 \u09A4\u09BE\u09CE\u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u09B8\u09CD\u09AC\u09DF\u0982\u0995\u09CD\u09B0\u09BF\u09DF\u09AD\u09BE\u09AC\u09C7 \u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u09B9\u09AC\u09C7\u0964`
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
    message: `\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0997\u09C3\u09B9\u09C0\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7 (TrxID: ${cleanTrxId}, \u099F\u09BE\u0995\u09BE: \u09F3${paidAmount})\u0964 \u0987\u0989\u099C\u09BE\u09B0 \u09B8\u09BE\u09AC\u09AE\u09BF\u099F \u0995\u09B0\u09B2\u09C7\u0987 \u09EB \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1\u09C7\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u0985\u099F\u09CB-\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u09B9\u09AC\u09C7\u0964`
  };
}
app.post(["/api/sms/webhook", "/api/sms/incoming"], async (req, res) => {
  try {
    const payload = { ...req.query, ...typeof req.body === "object" ? req.body : { message: req.body } };
    const result = await handleIncomingSmsPayload(payload);
    return res.json(result);
  } catch (err) {
    console.error("SMS Webhook POST error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/sms/webhook", "/api/sms/incoming"], async (req, res) => {
  try {
    const payload = req.query;
    const result = await handleIncomingSmsPayload(payload);
    return res.json(result);
  } catch (err) {
    console.error("SMS Webhook GET error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/admin/sms-test", async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: "\u09AE\u09C7\u09B8\u09C7\u099C \u09B2\u09BF\u0996\u09C1\u09A8 \u09AC\u09BE \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    const result = await handleIncomingSmsPayload({ message, sender: sender || "bKash" });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
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
app.post("/api/admin/sms-settings", (req, res) => {
  const updated = saveSmsSettings(req.body);
  res.json({ success: true, settings: updated, message: "\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
});
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
  <title>SN777 - \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09BF\u0995 \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09AD\u09C7\u09B0\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8</title>
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
            \u0985\u099F\u09CB \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09AD\u09C7\u09B0\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8
            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">\u09B8\u099A\u09B2</span>
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">\u09AA\u09BE\u09B0\u09CD\u09B8\u09CB\u09A8\u09BE\u09B2 \u09AC\u09BF\u0995\u09BE\u09B6, \u09A8\u0997\u09A6 \u0993 \u09B0\u0995\u09C7\u099F\u09C7 \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u0986\u09B8\u09B2\u09C7 \u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F \u0985\u099F\u09CB \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="/" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2">
          <i class="fa-solid fa-arrow-left"></i> \u0997\u09C7\u09AE\u09C7 \u09AB\u09BF\u09B0\u09C1\u09A8
        </a>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-slate-400 font-bold block mb-1">\u09AE\u09CB\u099F \u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 SMS</span>
        <span id="stat-total" class="text-2xl md:text-3xl font-black text-white">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-emerald-400 font-bold block mb-1">\u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD\u09A1</span>
        <span id="stat-approved" class="text-2xl md:text-3xl font-black text-emerald-400">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-cyan-400 font-bold block mb-1">\u09AA\u09C1\u09B2\u09C7 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A8</span>
        <span id="stat-pool" class="text-2xl md:text-3xl font-black text-cyan-400">0</span>
      </div>
      <div class="glass-card p-4 text-center">
        <span class="text-xs text-amber-400 font-bold block mb-1">\u0985\u099F\u09CB \u09AE\u09CB\u09A1</span>
        <span id="stat-mode" class="text-sm md:text-base font-black text-amber-400">\u099A\u09BE\u09B2\u09C1 (ON)</span>
      </div>
    </div>

    <!-- Webhook URL & Android Setup -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-link text-emerald-400"></i> \u0986\u09AA\u09A8\u09BE\u09B0 \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u0993\u09AF\u09BC\u09C7\u09AC\u09B9\u09C1\u0995 \u0987\u0989\u0986\u09B0\u098F\u09B2 (Webhook URL)
        </h2>
        <span class="text-xs text-slate-400">\u09AB\u09CB\u09A8\u09C7\u09B0 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u098F\u0987 \u09B2\u09BF\u0999\u09CD\u0995 \u09A6\u09BF\u09A8</span>
      </div>
      <div class="flex flex-col md:flex-row gap-2">
        <input id="webhook-url-input" type="text" readonly value="${webhookUrl}" class="flex-1 bg-slate-900 border border-slate-700 text-emerald-400 px-4 py-3 rounded-xl font-mono text-xs md:text-sm font-bold select-all focus:outline-none focus:border-emerald-500">
        <button onclick="copyWebhookUrl()" id="copy-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs md:text-sm px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
          <i class="fa-solid fa-copy"></i> \u0995\u09AA\u09BF \u0995\u09B0\u09C1\u09A8
        </button>
      </div>
      <div class="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
        <p class="text-slate-300 font-bold"><i class="fa-solid fa-circle-info text-cyan-400 mr-1"></i> \u0995\u09C0\u09AD\u09BE\u09AC\u09C7 \u09AA\u09BE\u09B0\u09CD\u09B8\u09CB\u09A8\u09BE\u09B2 \u09B8\u09BF\u09AE\u09C7 \u0985\u099F\u09CB \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09B8\u09C7\u099F\u0986\u09AA \u0995\u09B0\u09AC\u09C7\u09A8:</p>
        <p>\u09E7. \u0986\u09AA\u09A8\u09BE\u09B0 \u09AF\u09C7 \u09AB\u09CB\u09A8\u09C7 \u09AC\u09BF\u0995\u09BE\u09B6/\u09A8\u0997\u09A6 \u09B8\u09BF\u09AE\u099F\u09BF \u0986\u099B\u09C7, \u09B8\u09C7\u0987 \u09AB\u09CB\u09A8\u09C7 \u09AA\u09CD\u09B2\u09C7-\u09B8\u09CD\u099F\u09CB\u09B0 \u09A5\u09C7\u0995\u09C7 <b>"SMS Forwarder"</b> \u0985\u09A5\u09AC\u09BE <b>"MacroDroid"</b> \u0985\u09CD\u09AF\u09BE\u09AA \u0987\u09A8\u09CD\u09B8\u099F\u09B2 \u0995\u09B0\u09C1\u09A8\u0964</p>
        <p>\u09E8. \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09B0\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0985\u09AA\u09B6\u09A8\u09C7 <b>Webhook (HTTP POST/GET)</b> \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C7 \u0989\u09AA\u09B0\u09C7\u09B0 \u0987\u0989\u0986\u09B0\u098F\u09B2\u099F\u09BF \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964</p>
        <p>\u09E9. \u09AB\u09BF\u09B2\u09CD\u099F\u09BE\u09B0\u09C7 \u09AA\u09CD\u09B0\u09C7\u09B0\u0995 \u09A8\u09BE\u09AE \u09A6\u09BF\u09A8: <b>bKash, Nagad, 16247, 16167, Rocket</b>\u0964</p>
        <p>\u09EA. \u09AC\u09CD\u09AF\u09B8! \u098F\u0996\u09A8 \u09A5\u09C7\u0995\u09C7 \u09AA\u09BE\u09B0\u09CD\u09B8\u09CB\u09A8\u09BE\u09B2 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0\u09C7 \u099F\u09BE\u0995\u09BE \u0986\u09B8\u09BE\u09AE\u09BE\u09A4\u09CD\u09B0\u0987 \u09AB\u09CB\u09A8 \u09B8\u09CD\u09AC\u09DF\u0982\u0995\u09CD\u09B0\u09BF\u09DF\u09AD\u09BE\u09AC\u09C7 \u09AE\u09C7\u09B8\u09C7\u099C \u09AA\u09BE\u09A0\u09BF\u09DF\u09C7 \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09CB\u0997 \u0995\u09B0\u09C7 \u09A6\u09C7\u09AC\u09C7\u0964</p>
      </div>
    </div>

    <!-- Manual SMS Quick Paste Test -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-400"></i> \u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09AF\u09BC\u09BE\u09B2\u09BF SMS \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C7 \u09A4\u09BE\u09CE\u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD
        </h2>
        <span class="text-xs text-slate-400">\u09AB\u09CB\u09A8 \u09A5\u09C7\u0995\u09C7 \u09AE\u09C7\u09B8\u09C7\u099C \u0995\u09AA\u09BF \u0995\u09B0\u09C7 \u098F\u0996\u09BE\u09A8\u09C7 \u09A6\u09BF\u09A8</span>
      </div>
      <div class="space-y-3">
        <textarea id="manual-sms-text" rows="3" placeholder="\u0989\u09A6\u09BE\u09B9\u09B0\u09A3: You have received Tk 500.00 from 017xxxxxxxx. Ref . Fee Tk 0.00. Balance Tk 15,200.00. TrxID 9K38LS92 at 16/09/2026..." class="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-xs md:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono"></textarea>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-bold">\u09AA\u09CD\u09B0\u09CB\u09AD\u09BE\u0987\u09A1\u09BE\u09B0:</span>
            <select id="manual-sender-select" class="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none">
              <option value="bKash">bKash (\u09AC\u09BF\u0995\u09BE\u09B6)</option>
              <option value="Nagad">Nagad (\u09A8\u0997\u09A6)</option>
              <option value="Rocket">Rocket (\u09B0\u0995\u09C7\u099F)</option>
              <option value="Upay">Upay (\u0989\u09AA\u09BE\u09DF)</option>
            </select>
          </div>
          <button onclick="testManualSms()" id="test-btn" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <i class="fa-solid fa-check-double"></i> \u09AF\u09BE\u099A\u09BE\u0987 \u0993 \u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u0995\u09B0\u09C1\u09A8
          </button>
        </div>
      </div>
      <div id="test-result-box" class="hidden p-3 rounded-xl text-xs border font-mono"></div>
    </div>

    <!-- Live SMS Logs Feed -->
    <div class="glass-card p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="font-bold text-base text-white flex items-center gap-2">
          <i class="fa-solid fa-list-check text-cyan-400"></i> \u09B2\u09BE\u0987\u09AD \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09B9\u09BF\u09B8\u09CD\u099F\u09CD\u09B0\u09BF \u0993 \u099F\u09CD\u09B0\u09CD\u09AF\u09BE\u0995\u09BF\u0982
        </h2>
        <button onclick="loadLogs()" class="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold">
          <i class="fa-solid fa-arrows-rotate"></i> \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th class="py-2.5 px-3">\u09B8\u09AE\u09DF</th>
              <th class="py-2.5 px-3">\u09AA\u09CD\u09B0\u09CB\u09AD\u09BE\u0987\u09A1\u09BE\u09B0</th>
              <th class="py-2.5 px-3">TrxID</th>
              <th class="py-2.5 px-3">\u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3</th>
              <th class="py-2.5 px-3">\u09AA\u09CD\u09B0\u09C7\u09B0\u0995 \u09AB\u09CB\u09A8</th>
              <th class="py-2.5 px-3">\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8</th>
              <th class="py-2.5 px-3">\u0985\u09B0\u09CD\u09A1\u09BE\u09B0 / \u0987\u0989\u099C\u09BE\u09B0</th>
            </tr>
          </thead>
          <tbody id="logs-table-body" class="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td colspan="7" class="py-6 text-center text-slate-500">\u09A1\u09BE\u099F\u09BE \u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td>
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
      btn.innerHTML = '<i class="fa-solid fa-check"></i> \u0995\u09AA\u09BF \u09B9\u09DF\u09C7\u099B\u09C7!';
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
          tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-500">\u098F\u0996\u09A8\u09CB \u0995\u09CB\u09A8\u09CB \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964 \u0989\u09AA\u09B0\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09DF\u09BE\u09B2\u09BF \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C7 \u099F\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8 \u0985\u09A5\u09AC\u09BE \u09AB\u09CB\u09A8\u09C7 \u09AB\u09B0\u09CB\u09DF\u09BE\u09B0\u09CD\u09A1\u09BE\u09B0 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8\u0964</td></tr>';
          return;
        }

        tbody.innerHTML = data.logs.map(log => {
          let badge = '';
          if (log.status === 'auto_approved') {
            badge = '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">\u2713 \u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD\u09A1</span>';
          } else if (log.status === 'waiting_for_user') {
            badge = '<span class="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">\u23F3 \u09AA\u09C1\u09B2\u09C7 \u099C\u09AE\u09BE</span>';
          } else if (log.status === 'already_used') {
            badge = '<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">\u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4</span>';
          } else {
            badge = '<span class="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">\u0986\u09A8\u09AA\u09BE\u09B0\u09CD\u09B8\u09A1</span>';
          }

          const providerColor = log.provider === 'bkash' ? 'text-pink-400' : (log.provider === 'nagad' ? 'text-amber-400' : 'text-purple-400');
          const timeStr = log.receivedAt ? new Date(log.receivedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

          return \`<tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-2.5 px-3 text-slate-400 text-[11px]">\${timeStr}</td>
            <td class="py-2.5 px-3 font-bold uppercase \${providerColor}">\${log.provider || 'bKash'}</td>
            <td class="py-2.5 px-3 text-white font-bold">\${log.trxId || '-'}</td>
            <td class="py-2.5 px-3 text-emerald-400 font-bold">\${log.amount ? '\u09F3 ' + log.amount : '-'}</td>
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
        alert("\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09AE\u09C7\u09B8\u09C7\u099C\u09C7\u09B0 \u099F\u09C7\u0995\u09CD\u09B8\u099F \u09B2\u09BF\u0996\u09C1\u09A8 \u09AC\u09BE \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> \u09AF\u09BE\u099A\u09BE\u0987 \u09B9\u099A\u09CD\u099B\u09C7...';

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
          resultBox.innerHTML = \`<p class="font-bold text-sm">\u2713 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u09B9\u09DF\u09C7\u099B\u09C7!</p>
            <p class="mt-1">\u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u09A8\u0982: #\${data.order_no} | \u0987\u0989\u099C\u09BE\u09B0: \${data.username || 'User'} | \u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3: \u09F3\${data.amount}</p>\`;
        } else if (data.status === "waiting_for_user") {
          resultBox.classList.add("bg-cyan-950/60", "border-cyan-500/40", "text-cyan-300");
          resultBox.innerHTML = \`<p class="font-bold text-sm">\u2139 \u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987\u09A1 \u09AA\u09C1\u09B2\u09C7 \u099C\u09AE\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!</p>
            <p class="mt-1">TrxID: <b>\${data.trxId}</b> | \u099F\u09BE\u0995\u09BE: <b>\u09F3\${data.amount}</b></p>
            <p class="text-slate-400 mt-1">\u0987\u0989\u099C\u09BE\u09B0 \u098F\u0987 TrxID \u09A6\u09BF\u09DF\u09C7 \u09B8\u09BE\u09AC\u09AE\u09BF\u099F \u0995\u09B0\u09B2\u09C7\u0987 \u09A4\u09BE\u09B0 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997 \u09B9\u09AC\u09C7\u0964</p>\`;
        } else {
          resultBox.classList.add("bg-amber-950/60", "border-amber-500/40", "text-amber-300");
          resultBox.innerHTML = \`<p class="font-bold">\${data.message || '\u09AE\u09C7\u09B8\u09C7\u099C \u09AA\u09CD\u09B0\u09B8\u09C7\u09B8 \u09B9\u09DF\u09C7\u099B\u09C7'}</p>\`;
        }

        loadLogs();
      } catch (err) {
        resultBox.classList.remove("hidden");
        resultBox.classList.add("bg-red-950/60", "border-red-500/40", "text-red-300");
        resultBox.textContent = "\u09A4\u09CD\u09B0\u09C1\u099F\u09BF: " + err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> \u09AF\u09BE\u099A\u09BE\u0987 \u0993 \u0985\u099F\u09CB-\u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u0995\u09B0\u09C1\u09A8';
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
    } catch (e) {
    }
    let depositData = null;
    const localList = getLocalTransactions();
    const localItem = localList.find((x) => x.order_no === cleanOrderNo || x.id === cleanOrderNo || x.depositNo === cleanOrderNo || transactionId && x.transactionId && String(x.transactionId).toUpperCase() === String(transactionId).toUpperCase());
    if (localItem) {
      depositData = { ...localItem };
    }
    if (db && (!depositData || depositData.status !== "approved") && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        let dSnap = await Promise.race([
          db.collection("deposits").doc(cleanOrderNo).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (dSnap && dSnap.exists) {
          depositData = { ...depositData, ...dSnap.data() };
        } else {
          let qSnap = await Promise.race([
            db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
          ]).catch(() => null);
          if (qSnap && !qSnap.empty) {
            depositData = { ...depositData, ...qSnap.docs[0].data() };
          } else if (transactionId) {
            let tSnap = await Promise.race([
              db.collection("deposits").where("transactionId", "==", transactionId).limit(1).get(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
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
        error: "\u09AD\u09C1\u09B2 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF! \u0995\u09CB\u09A8\u09CB \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF\u0964",
        amount: 0,
        finalCredit: 0
      });
    }
    let isApproved = depositData.status === "approved" || depositData.status === "success" || depositData.credited === true;
    if (!isApproved) {
      const candidateTrxId = String(depositData.transactionId || depositData.order_no || cleanOrderNo || "").toUpperCase().trim();
      const matchedSms = findMatchingSmsInPool(candidateTrxId, depositData.amount);
      if (matchedSms && !matchedSms.claimed) {
        console.log(`[verify-payment] Found matching verified SMS in pool for TrxID: ${candidateTrxId}! Auto-approving immediately!`);
        await approveAndCreditDeposit(cleanOrderNo, matchedSms.amount || depositData.amount, depositData.uid);
        claimPoolSms(candidateTrxId, cleanOrderNo, depositData.uid);
        const refreshedList = getLocalTransactions();
        const refreshedItem = refreshedList.find((x) => x.order_no === cleanOrderNo || x.id === cleanOrderNo);
        if (refreshedItem) depositData = { ...depositData, ...refreshedItem };
        isApproved = true;
      }
    }
    if (isApproved && depositData && depositData.balanceCredited !== true) {
      console.log(`[verify-payment] Deposit #${cleanOrderNo} is approved but balance was not credited. Crediting now...`);
      const creditRes = await approveAndCreditDeposit(cleanOrderNo, Number(depositData.amount || depositData.finalCredit || 0), depositData.uid);
      if (creditRes) depositData = { ...depositData, ...creditRes };
    }
    const isPending = !isApproved && (depositData.status === "pending" || depositData.status === "processing");
    const currentStatus = isApproved ? "approved" : isPending ? "pending" : "failed";
    res.json({
      success: isApproved,
      status: currentStatus,
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || depositData?.amount || 0,
      message: isApproved ? "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987 \u0993 \u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" : isPending ? "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u09A7\u09C0\u09A8 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7..." : "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09AC\u09BE \u09AC\u09BE\u09A4\u09BF\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964"
    });
  } catch (err) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message, success: false, status: "failed" });
  }
});
app.post("/api/validate-manual-deposit", async (req, res) => {
  try {
    const { uid, transactionId, order_no, amount } = req.body;
    const cleanTxId = String(transactionId || order_no || "").trim();
    if (!cleanTxId) {
      return res.status(400).json({ success: false, error: "\u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    if (cleanTxId.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(cleanTxId) || /^(.)\1+$/.test(cleanTxId)) {
      return res.status(400).json({
        success: false,
        error: "\u09AD\u09C1\u09B2 \u09AC\u09BE \u09AB\u09C7\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF! \u09AB\u09B0\u09AE\u09CD\u09AF\u09BE\u099F \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF (\u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EE \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B8\u09A0\u09BF\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09A6\u09BF\u09A8)\u0964"
      });
    }
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {
    }
    if (db && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        const querySnap = await Promise.race([
          db.collection("deposits").where("transactionId", "==", cleanTxId).limit(10).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (querySnap && !querySnap.empty) {
          for (const doc of querySnap.docs) {
            if (doc.id !== order_no) {
              const d = doc.data();
              if (d.status === "approved" || d.status === "success" || d.credited === true) {
                return res.status(400).json({
                  success: false,
                  error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7! \u098F\u0995\u0987 \u0986\u0987\u09A1\u09BF \u09AC\u09BE\u09B0\u09AC\u09BE\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC \u09A8\u09DF\u0964"
                });
              } else if (d.status === "pending") {
                return res.status(400).json({
                  success: false,
                  error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09A6\u09BF\u09DF\u09C7 \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A8 \u09B0\u09DF\u09C7\u099B\u09C7\u0964"
                });
              }
            }
          }
        }
        const queryOrderSnap = await Promise.race([
          db.collection("deposits").where("order_no", "==", cleanTxId).limit(10).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (queryOrderSnap && !queryOrderSnap.empty) {
          for (const doc of queryOrderSnap.docs) {
            if (doc.id !== order_no) {
              const d = doc.data();
              if (d.status === "approved" || d.status === "success" || d.credited === true) {
                return res.status(400).json({
                  success: false,
                  error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7!"
                });
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr);
      }
    }
    const localList = getLocalTransactions();
    const isDupApproved = localList.some(
      (x) => x.id !== order_no && x.order_no !== order_no && (x.transactionId === cleanTxId || x.order_no === cleanTxId || x.id === cleanTxId) && (x.status === "approved" || x.credited === true)
    );
    if (isDupApproved) {
      return res.status(400).json({
        success: false,
        error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7!"
      });
    }
    const matchedSms = findMatchingSmsInPool(cleanTxId);
    return res.json({
      success: true,
      autoMatchReady: !!matchedSms,
      smsAmount: matchedSms ? matchedSms.amount : null,
      message: matchedSms ? `\u098F\u09B8\u098F\u09AE\u098F\u09B8 \u09AA\u09BE\u0993\u09DF\u09BE \u0997\u09C7\u099B\u09C7 (\u09F3${matchedSms.amount})! \u09B8\u09BE\u09AC\u09AE\u09BF\u099F \u0995\u09B0\u09B2\u09C7\u0987 \u09A4\u09BE\u09CE\u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09CB\u0997 \u09B9\u09AC\u09C7\u0964` : "\u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09AC\u09C8\u09A7 \u098F\u09AC\u0982 \u0997\u09CD\u09B0\u09B9\u09A3 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, uid: reqUid, username: reqUsername, amount, finalCredit: reqFinalCredit } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no or doc_id" });
    }
    const localList = getLocalTransactions();
    const existing = localList.find((t) => t.id === cleanOrderNo || t.order_no === cleanOrderNo);
    let requestedAmount = Number(amount) || existing && Number(existing.amount) || 0;
    let finalCredit = Number(reqFinalCredit) || requestedAmount;
    let uid = reqUid || existing && existing.uid || "";
    let username = reqUsername || existing && (existing.username || existing.accountHolder) || "";
    if (existing) {
      if (existing.status === "approved" && existing.credited === true) {
        return res.json({ success: true, message: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7\u0987 \u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u0995\u09B0\u09BE \u09B0\u09DF\u09C7\u099B\u09C7\u0964", amount: requestedAmount, finalCredit });
      }
    }
    const approvedTx = {
      ...existing || {},
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid,
      username,
      amount: requestedAmount,
      finalCredit,
      status: "approved",
      credited: true,
      type: "deposit",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveLocalTransaction(approvedTx);
    res.json({
      success: true,
      message: "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964",
      amount: requestedAmount,
      finalCredit
    });
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
          finalCredit,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          processedAt: (/* @__PURE__ */ new Date()).toISOString(),
          description: "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09C7\u099B\u09C7 (\u09F3" + finalCredit + " \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7)",
          ...uid && { uid },
          ...username && { username }
        };
        const batchTasks = [
          db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }),
          db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true })
          );
        }
        if (uid && finalCredit > 0) {
          const userRef = db.collection("users").doc(uid);
          batchTasks.push(
            (async () => {
              const userSnap = await userRef.get().catch(() => null);
              if (userSnap && userSnap.exists) {
                const curBal = parseFloat(String(userSnap.data()?.balance || "0").replace(/,/g, "")) || 0;
                const newBal = (curBal + finalCredit).toFixed(2);
                await userRef.set({ balance: newBal, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => {
                });
              }
            })()
          );
        }
        await Promise.allSettled(batchTasks);
      } catch (e) {
      }
    })();
  } catch (err) {
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
    let uid = reqUid || existing && existing.uid || "";
    const wasCredited = existing && (existing.status === "approved" || existing.credited === true);
    const creditedAmount = wasCredited ? Number(existing.finalCredit || existing.amount || 0) : 0;
    saveLocalTransaction({
      ...existing || {},
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      status: "rejected",
      cancelled: true,
      credited: false,
      rejectReason: reason || "\u09AD\u09C1\u09B2 \u09AC\u09BE \u09AB\u09C7\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF",
      type: "deposit",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ success: true, message: "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B0\u09BF\u099C\u09C7\u0995\u09CD\u099F/\u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        let depData = null;
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
          rejectReason: reason || "\u09AD\u09C1\u09B2 \u09AC\u09BE \u09AB\u09C7\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          processedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...uid && { uid },
          ...doc_id && { doc_id }
        };
        const batchTasks = [
          db.collection("deposits").doc(cleanOrderNo).set(rejectPayload, { merge: true }),
          db.collection("transactions").doc(cleanOrderNo).set(rejectPayload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(rejectPayload, { merge: true })
          );
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
                    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                  }, { merge: true }).catch(() => {
                  });
                }
              })()
            );
          }
        }
        await Promise.allSettled(batchTasks);
      } catch (e) {
      }
    })();
  } catch (err) {
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
    let uid = reqUid || existing && existing.uid || "";
    saveLocalTransaction({
      ...existing || {},
      id: cleanId,
      withdrawNo: cleanId,
      uid,
      status: "approved",
      type: "withdraw",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ success: true, message: "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B0\u09C1\u09AD \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        const payload = {
          status: "approved",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          processedAt: (/* @__PURE__ */ new Date()).toISOString(),
          description: "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09C7\u099B\u09C7 (\u09B8\u09BE\u0995\u09B8\u09C7\u09B8\u09AB\u09C1\u09B2)"
        };
        const batchTasks = [
          db.collection("withdrawals").doc(cleanId).set(payload, { merge: true }),
          db.collection("transactions").doc(cleanId).set(payload, { merge: true })
        ];
        if (uid) {
          batchTasks.push(
            db.collection("users").doc(uid).collection("history").doc(cleanId).set(payload, { merge: true })
          );
        }
        await Promise.allSettled(batchTasks);
      } catch (e) {
      }
    })();
  } catch (err) {
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
    let uid = reqUid || existing && existing.uid || "";
    saveLocalTransaction({
      ...existing || {},
      id: cleanId,
      withdrawNo: cleanId,
      uid,
      status: "rejected",
      cancelled: true,
      rejectReason: reason || "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AB\u09C7\u09B0\u09A4 \u09A6\u09C7\u0993\u09DF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7",
      type: "withdraw",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ success: true, message: "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09B0\u09BF\u099C\u09C7\u0995\u09CD\u099F/\u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AB\u09C7\u09B0\u09A4 \u09A6\u09C7\u0993\u09DF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      try {
        const db = adminApp.firestore();
        const payload = {
          status: "rejected",
          cancelled: true,
          rejectReason: reason || "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AB\u09C7\u09B0\u09A4 \u09A6\u09C7\u0993\u09DF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          processedAt: (/* @__PURE__ */ new Date()).toISOString(),
          description: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F\u099F\u09BF \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AB\u09C7\u09B0\u09A4 \u09A6\u09C7\u0993\u09DF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
        };
        const batchTasks = [
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
                await userRef.set({ balance: newBal, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true }).catch(() => {
                });
              }
            })()
          );
        }
        await Promise.allSettled(batchTasks);
      } catch (e) {
      }
    })();
  } catch (err) {
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
    } catch (e) {
    }
    const results = [];
    const processedOrders = /* @__PURE__ */ new Set();
    try {
      const localList = getLocalTransactions();
      for (const t of localList) {
        if (t.uid === uid && t.type === "deposit") {
          const orderKey = String(t.order_no || t.id || "");
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
          if ((t.status === "approved" || t.credited === true) && t.type === "deposit") {
            if (t.balanceCredited !== true) {
              await approveAndCreditDeposit(orderKey, Number(t.amount || t.finalCredit || 0), uid);
            }
            if (!processedOrders.has(orderKey)) {
              processedOrders.add(orderKey);
              const isUnnotified = t.notified === false || t.notified !== true && t.notified !== "true";
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
    let userDocData = null;
    if (db && Date.now() >= firestoreQuotaExceededUntil) {
      try {
        const uSnap = await Promise.race([
          db.collection("users").doc(uid).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (uSnap && uSnap.exists) userDocData = uSnap.data();
      } catch (err) {
      }
      try {
        const depSnap = await Promise.race([
          db.collection("deposits").where("uid", "==", uid).limit(10).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (depSnap && !depSnap.empty) {
          for (const doc of depSnap.docs) {
            const parsed = doc.data();
            const order_no = doc.id;
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
            const isUnnotified = parsed.notified === false || parsed.notified !== true && parsed.notified !== "true";
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
              doc.ref.update({ notified: true }).catch(() => {
              });
            }
          }
        }
        const freshSnap = await Promise.race([
          db.collection("users").doc(uid).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))
        ]).catch(() => null);
        if (freshSnap && freshSnap.exists) userDocData = freshSnap.data();
      } catch (err) {
      }
    }
    if (!userDocData) {
      try {
        const restUser = await firestoreRestGet("users", uid);
        if (restUser && (restUser.balance !== void 0 || restUser.username)) {
          userDocData = restUser;
        }
      } catch (e) {
      }
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
    const localStoreCheck = getLocalUsersStore();
    const activeLocal = localStoreCheck[uid] || localStoreCheck[uid.toLowerCase()] || userDocData?.username && localStoreCheck[userDocData.username];
    if (activeLocal && activeLocal.balance !== void 0) {
      if (!userDocData) userDocData = {};
      const numLocal = parseFloat(String(activeLocal.balance).replace(/,/g, "")) || 0;
      const numFs = parseFloat(String(userDocData.balance || "0").replace(/,/g, "")) || 0;
      if (numLocal > numFs) {
        userDocData.balance = activeLocal.balance;
      }
      if (activeLocal.totalDeposited !== void 0 && activeLocal.totalDeposited > (userDocData.totalDeposited || 0)) {
        userDocData.totalDeposited = activeLocal.totalDeposited;
      }
      if (activeLocal.approvedDepositsCount !== void 0 && activeLocal.approvedDepositsCount > (userDocData.approvedDepositsCount || 0)) {
        userDocData.approvedDepositsCount = activeLocal.approvedDepositsCount;
      }
    }
    return res.json({ success: true, results, user: userDocData });
  } catch (e) {
    return res.json({ success: true, results: [], user: null });
  }
});
app.post("/api/dismiss-deposit-notification", async (req, res) => {
  try {
    const { order_no, orderId, id } = req.body || {};
    const targetOrder = String(order_no || orderId || id || "").trim();
    if (targetOrder) {
      const localList = getLocalTransactions();
      const t = localList.find((x) => x.id === targetOrder || x.order_no === targetOrder);
      if (t) {
        t.notified = true;
        saveLocalTransaction(t);
      }
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          await db.collection("deposits").doc(targetOrder).set({ notified: true }, { merge: true }).catch(() => {
          });
        }
      } catch (fbErr) {
      }
    }
    return res.json({ success: true, dismissed: targetOrder });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});
var GOPAY_APP_ID = process.env.GOPAY_APP_ID || "GP_47479521";
var GOPAY_SECRET_KEY = process.env.GOPAY_SECRET_KEY || "77a2d3a02360d495a1b07abfe5b196e8";
var GOPAY_API_URL = "https://mch.go-pay.cyou/pay.php";
var lastOrderIdTime = 0;
function generateCleanOrderId(customOrderNo) {
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
function formatGoPayOrderDate(d = /* @__PURE__ */ new Date()) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function generateGoPaySign(params, secretKey) {
  const keys = Object.keys(params).filter((k) => k !== "sign" && k !== "sign_type" && k !== "signType" && params[k] !== void 0 && params[k] !== null && String(params[k]).trim() !== "").sort();
  const signStr = keys.map((k) => `${k}=${params[k]}`).join("&") + `&key=${secretKey}`;
  return import_crypto.default.createHash("md5").update(signStr, "utf8").digest("hex").toLowerCase();
}
app.all(["/gopay_pay.php", "/pay.php", "/gopay", "/propay_pay.php", "/api/gopay-pay", "/api/propay-pay", "/api/create-payment"], async (req, res) => {
  try {
    const rawUid = String(req.query.uid || req.body?.uid || "").trim();
    if (!rawUid || rawUid.startsWith("guest_")) {
      return res.status(403).json({ error: "Unauthorized: Please log in to initiate a payment." });
    }
    const effectiveUid = rawUid;
    const rawAmount = req.query.amount || req.body?.amount || 200;
    const amount = Math.round(parseFloat(String(rawAmount)) || 200);
    const method = String(req.query.method || req.body?.method || "bkash").trim().toLowerCase();
    const customOrderNo = String(req.query.order_no || req.body?.order_no || "").trim();
    const order_no = generateCleanOrderId(customOrderNo);
    let username = String(req.query.username || req.body?.username || "").trim();
    let phone = String(req.query.phone || req.body?.phone || req.query.userPhone || req.body?.userPhone || "").trim();
    const adminApp = getFirebaseAdmin();
    if (adminApp && rawUid && (!username || !phone)) {
      try {
        const uSnap = await adminApp.firestore().collection("users").doc(rawUid).get().catch(() => null);
        if (uSnap && uSnap.exists) {
          const uData = uSnap.data() || {};
          if (!username) username = uData.username || uData.name || uData.displayName || rawUid;
          if (!phone) phone = uData.phone || uData.phoneNumber || uData.accountNumber || "";
        }
      } catch (e) {
      }
    }
    const host = req.get("host") || "www.sn777.site";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const origin = `${protocol}://${host}`;
    const pay_type = method === "nagad" ? "2201" : "2202";
    const goods_name = method === "nagad" ? "NAGAD" : "BKASH";
    const order_date = formatGoPayOrderDate();
    const returnUrl = `https://sn777.site/return?order_no=${encodeURIComponent(order_no)}`;
    const notifyUrl = process.env.GOPAY_NOTIFY_URL || `https://sn777.site/gopay_notify.php`;
    const gopayParams = {
      app_id: GOPAY_APP_ID,
      mch_order_no: order_no,
      trade_amount: String(amount),
      pay_type,
      goods_name,
      notify_url: notifyUrl,
      page_url: returnUrl,
      mch_return_msg: effectiveUid || username || "sn777_user",
      order_date,
      sign_type: "MD5"
    };
    const sign = generateGoPaySign(gopayParams, GOPAY_SECRET_KEY);
    gopayParams.sign = sign;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const rawBonusOption = String(req.query.bonusOption || req.body?.bonusOption || req.query.promotion || req.body?.promotion || req.query.bonus || req.body?.bonus || "").trim();
    const explicitBonus = parseFloat(String(req.query.bonusAmount || req.body?.bonusAmount || req.query.finalCredit || req.body?.finalCredit || 0)) || 0;
    const calcBonus = getDepositFinalCredit(amount, rawBonusOption, explicitBonus);
    const depositFinalCredit = calcBonus.finalCredit;
    const depositBonusAmt = calcBonus.bonusAmount;
    paymentOrdersCache.set(order_no, {
      uid: effectiveUid,
      username: username || effectiveUid,
      phone,
      amount,
      time: Date.now()
    });
    const pendingTx = {
      id: order_no,
      order_no,
      orderId: order_no,
      depositNo: order_no,
      serialNo: order_no,
      doc_id: order_no,
      transactionId: order_no,
      uid: effectiveUid,
      username: username || effectiveUid,
      phone,
      userPhone: phone,
      accountNumber: phone,
      type: "deposit",
      amount,
      bonusAmount: depositBonusAmt,
      bonusOption: rawBonusOption || (depositBonusAmt > 0 ? "100% Deposit Bonus" : "No Bonus"),
      finalCredit: depositFinalCredit,
      displayAmount: depositFinalCredit,
      method,
      status: "pending",
      gateway: "gopay",
      timestamp: nowIso,
      createdAt: nowIso,
      description: `GoPay ${goods_name} Deposit (${order_no})`
    };
    saveLocalTransaction(pendingTx);
    if (adminApp) {
      try {
        const db = adminApp.firestore();
        Promise.all([
          db.collection("deposits").doc(order_no).set(pendingTx, { merge: true }),
          db.collection("transactions").doc(order_no).set(pendingTx, { merge: true }),
          effectiveUid ? db.collection("users").doc(effectiveUid).collection("history").doc(order_no).set(pendingTx, { merge: true }) : Promise.resolve()
        ]).catch(() => {
        });
      } catch (dbErr) {
      }
    }
    console.log(`[GoPay Initiate] Calling ${GOPAY_API_URL} for order ${order_no}, amount ${amount}, method ${goods_name}`);
    const formBody = new URLSearchParams(gopayParams).toString();
    let resText = "";
    try {
      const gopayRes = await fetch(GOPAY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formBody,
        signal: AbortSignal.timeout(800)
      });
      resText = await gopayRes.text();
      console.log(`[GoPay Response] Status ${gopayRes.status}:`, resText);
    } catch (fErr) {
      console.warn("[GoPay Fast Timeout/Error] Remote payment gateway slow or unreachable:", fErr.message);
    }
    let redirectUrl = "";
    let tradeMsg = "";
    let tradeNo = "";
    let respCode = "";
    if (resText) {
      try {
        const parsedRes = JSON.parse(resText);
        respCode = parsedRes?.respCode || "";
        tradeMsg = parsedRes?.tradeMsg || "";
        tradeNo = parsedRes?.tradeNo || parsedRes?.mchOrderNo || parsedRes?.orderNo || "";
        if (parsedRes && (parsedRes.respCode === "SUCCESS" || parsedRes.tradeResult === "1")) {
          redirectUrl = parsedRes.payUrl || parsedRes.pay_url || parsedRes.payInfo || parsedRes.redirect_url || parsedRes.url || "";
        } else if (parsedRes && (parsedRes.payUrl || parsedRes.pay_url || parsedRes.payInfo || parsedRes.redirect_url || parsedRes.url)) {
          redirectUrl = parsedRes.payUrl || parsedRes.pay_url || parsedRes.payInfo || parsedRes.redirect_url || parsedRes.url;
        }
      } catch (e) {
        console.warn("[GoPay Parse Non-JSON Response]:", resText);
      }
    }
    if (!redirectUrl) {
      redirectUrl = `${origin}/?deposit_modal=true&order_no=${encodeURIComponent(order_no)}&amount=${amount}&method=${encodeURIComponent(method)}&trx_id=${encodeURIComponent(order_no)}`;
    }
    if (tradeNo) {
      try {
        const localList = getLocalTransactions();
        const existing = localList.find((item) => item.id === order_no || item.order_no === order_no);
        if (existing) {
          existing.tradeNo = tradeNo;
          saveLocalTransaction(existing);
        }
        if (adminApp) {
          const db = adminApp.firestore();
          await db.collection("deposits").doc(order_no).set({ tradeNo }, { merge: true }).catch(() => {
          });
          await db.collection("transactions").doc(order_no).set({ tradeNo }, { merge: true }).catch(() => {
          });
        }
      } catch (tErr) {
      }
    }
    if (req.headers.accept && req.headers.accept.includes("application/json") && !req.query.redirect) {
      return res.json({
        success: true,
        respCode: "SUCCESS",
        tradeMsg: tradeMsg || "request success",
        redirect_url: redirectUrl,
        payUrl: redirectUrl,
        pay_url: redirectUrl,
        tradeNo: tradeNo || order_no,
        order_no
      });
    }
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("[GoPay Pay Error]:", err);
    return res.status(500).json({ error: err.message, success: false });
  }
});
function extractCallbackData(req) {
  let rawData = {};
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
    rawData = { ...req.body };
  } else if (typeof req.body === "string" && req.body.trim()) {
    const trimmed = req.body.trim();
    if (trimmed.startsWith("{")) {
      try {
        rawData = JSON.parse(trimmed);
      } catch (e) {
      }
    } else {
      try {
        const usp = new URLSearchParams(trimmed);
        for (const [k, v] of usp.entries()) {
          rawData[k] = v;
        }
      } catch (e) {
      }
    }
  }
  if (Object.keys(rawData).length === 0 && req.query && Object.keys(req.query).length > 0) {
    rawData = { ...req.query };
  }
  return rawData;
}
var WEBHOOK_CALLBACK_ROUTES = [
  "/gopay_notify.php",
  "/callback.php",
  "/notify.php",
  "/gopay_callback.php",
  "/notify_url",
  "/notify",
  "/callback",
  "/api/gopay-notify",
  "/api/gopay-callback",
  "/api/propay-callback",
  "/api/callback",
  "/api/notify",
  "/api/payment-callback",
  "/webhook",
  "/api/webhook"
];
app.all(WEBHOOK_CALLBACK_ROUTES, async (req, res) => {
  try {
    const rawData = extractCallbackData(req);
    const secretKey = GOPAY_SECRET_KEY || "77a2d3a02360d495a1b07abfe5b196e8";
    if (!rawData || Object.keys(rawData).length === 0) {
      console.warn("[Gateway Webhook] Empty payload received");
      return res.status(200).type("text/plain").send("fail");
    }
    const signParams = { ...rawData };
    delete signParams["sign"];
    delete signParams["signType"];
    delete signParams["sign_type"];
    const sortedKeys = Object.keys(signParams).sort();
    let signStr = "";
    for (const k of sortedKeys) {
      const v = signParams[k];
      if (v !== "" && v !== null && v !== void 0) {
        signStr += `${k}=${v}&`;
      }
    }
    signStr += `key=${secretKey}`;
    const calculatedSign = import_crypto.default.createHash("md5").update(signStr, "utf8").digest("hex").toLowerCase();
    const receivedSign = rawData.sign ? String(rawData.sign).toLowerCase().trim() : "";
    const tradeResult = String(rawData.tradeResult !== void 0 ? rawData.tradeResult : "").trim();
    const isTradeSuccess = tradeResult === "1" || tradeResult.toLowerCase() === "success";
    const order_no = String(rawData.mchOrderNo || rawData.mch_order_no || rawData.order_no || rawData.out_trade_no || "").trim();
    const amount = parseFloat(String(rawData.amount || rawData.trade_amount || 0)) || 0;
    const tradeNo = String(rawData.tradeNo || rawData.trade_no || "");
    const callbackUid = String(rawData.mch_return_msg || rawData.mchReturnMsg || rawData.uid || "").trim();
    console.log(`[Gateway Webhook] Captured callback: order=${order_no}, amount=${amount}, tradeResult=${tradeResult}, tradeNo=${tradeNo}`);
    console.log(`[Gateway Webhook] Signature: calculated=${calculatedSign}, received=${receivedSign}, match=${calculatedSign === receivedSign}`);
    if (receivedSign && calculatedSign !== receivedSign) {
      console.warn(`[Gateway Webhook] Signature verification failed! calc: ${calculatedSign}, recv: ${receivedSign}, signStr: ${signStr}`);
      return res.status(200).type("text/plain").send("fail");
    }
    if (!isTradeSuccess) {
      console.warn(`[Gateway Webhook] Trade result not successful: ${tradeResult}`);
      return res.status(200).type("text/plain").send("fail");
    }
    if (order_no) {
      try {
        await approveAndCreditDeposit(order_no, amount, callbackUid, tradeNo, rawData);
        console.log(`[Gateway Webhook] Successfully processed and approved order ${order_no} for uid ${callbackUid}`);
      } catch (bgErr) {
        console.error("[Gateway Webhook Error]:", bgErr);
      }
    }
    return res.status(200).type("text/plain").send("success");
  } catch (err) {
    console.error("[Gateway Webhook Error]:", err);
    if (!res.headersSent) {
      return res.status(200).type("text/plain").send("fail");
    }
  }
});
app.get("/api/user-balance", (req, res) => {
  const uid = String(req.query.uid || req.query.username || "").trim();
  if (!uid) return res.json({ success: true, balance: "777.00" });
  const bal = getLocalUserBalance(uid);
  return res.json({ success: true, balance: bal.toFixed(2) });
});
app.all(["/return", "/success.php", "/success"], (req, res) => {
  const order_no = req.query.order_no || req.body?.order_no || "";
  return res.redirect(`/?m=1&order_no=${encodeURIComponent(String(order_no))}`);
});
async function startServer() {
  const distPath = import_path2.default.join(process.cwd(), "dist");
  const distBackupPath = import_path2.default.join(process.cwd(), "dist_backup");
  if (!import_fs2.default.existsSync(distPath) || !import_fs2.default.existsSync(import_path2.default.join(distPath, "index.html"))) {
    try {
      import_fs2.default.mkdirSync(distPath, { recursive: true });
      if (import_fs2.default.existsSync(distBackupPath)) {
        import_fs2.default.cpSync(distBackupPath, distPath, { recursive: true });
      }
    } catch (e) {
    }
  }
  const staticOptions = {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.includes("/assets/") || filePath.endsWith(".js") || filePath.endsWith(".css") || filePath.endsWith(".webp") || filePath.endsWith(".png") || filePath.endsWith(".woff2")) {
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      } else {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    }
  };
  app.use(import_express.default.static(distPath, staticOptions));
  if (import_fs2.default.existsSync(distBackupPath)) {
    app.use(import_express.default.static(distBackupPath, staticOptions));
  }
  app.get("/assets/:filename", async (req, res, next) => {
    const filename = req.params.filename;
    const fileInDist = import_path2.default.join(distPath, "assets", filename);
    const fileInBackup = import_path2.default.join(distBackupPath, "assets", filename);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (import_fs2.default.existsSync(fileInDist)) {
      return res.sendFile(fileInDist);
    }
    if (import_fs2.default.existsSync(fileInBackup)) {
      return res.sendFile(fileInBackup);
    }
    try {
      const remoteRes = await fetch(`https://sn777.site/assets/${filename}`);
      if (remoteRes.ok) {
        const buf = Buffer.from(await remoteRes.arrayBuffer());
        try {
          import_fs2.default.mkdirSync(import_path2.default.join(distPath, "assets"), { recursive: true });
          import_fs2.default.writeFileSync(fileInDist, buf);
        } catch (e) {
        }
        res.setHeader("Content-Type", remoteRes.headers.get("content-type") || "application/javascript");
        return res.send(buf);
      }
    } catch (e) {
    }
    next();
  });
  app.get("/manifest.json", (req, res) => {
    const manifestPath = import_path2.default.join(process.cwd(), "manifest.json");
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(manifestPath);
  });
  app.get("/sw.js", (req, res) => {
    const swPath = import_fs2.default.existsSync(import_path2.default.join(process.cwd(), "sw.js")) ? import_path2.default.join(process.cwd(), "sw.js") : import_fs2.default.existsSync(import_path2.default.join(distPath, "sw.js")) ? import_path2.default.join(distPath, "sw.js") : import_path2.default.join(distBackupPath, "sw.js");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(swPath);
  });
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/__aistudio") || req.path.startsWith("/api")) {
      return next();
    }
    const indexPath = import_fs2.default.existsSync(import_path2.default.join(distPath, "index.html")) ? import_path2.default.join(distPath, "index.html") : import_path2.default.join(distBackupPath, "index.html");
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.sendFile(indexPath);
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setTimeout(() => {
      reconcileUncreditedApprovedDeposits();
    }, 3e3);
  });
}
startServer();
