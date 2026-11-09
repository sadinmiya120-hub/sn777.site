import fs from "fs";
import path from "path";

export interface ParsedSms {
  provider: "bkash" | "nagad" | "rocket" | "upay" | "unknown";
  trxId: string | null;
  amount: number | null;
  senderPhone: string | null;
  raw: string;
  senderHint?: string;
  detectedAt: string;
}

export interface SmsLog {
  id: string;
  rawText: string;
  sender: string;
  provider: "bkash" | "nagad" | "rocket" | "upay" | "unknown";
  trxId: string | null;
  amount: number | null;
  senderPhone: string | null;
  receivedAt: string;
  matched: boolean;
  matchedOrderNo?: string;
  matchedUid?: string;
  autoApproved: boolean;
  status: "auto_approved" | "waiting_for_user" | "already_used" | "failed" | "unparsed" | "ignored";
  note?: string;
}

export interface VerifiedSmsPoolItem {
  trxId: string; // Stored in UPPERCASE for fast case-insensitive matching
  amount: number;
  provider: string;
  senderPhone: string | null;
  rawText: string;
  receivedAt: string;
  claimed: boolean;
  claimedAt?: string;
  claimedByUid?: string;
  claimedOrderNo?: string;
}

export interface SmsSettings {
  enabled: boolean;
  secretKey: string;
  autoApprove: boolean;
  allowAdminManualPaste: boolean;
  updatedAt: string;
}

const SMS_LOGS_FILE = path.join(process.cwd(), "data", "sms_logs.json");
const SMS_POOL_FILE = path.join(process.cwd(), "data", "verified_sms_pool.json");
const SMS_SETTINGS_FILE = path.join(process.cwd(), "data", "sms_settings.json");

// Ensure data folder exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Helper to convert Bengali numbers to English numbers
export function convertBengaliDigits(str: string): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return str.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
}

// 1. Intelligent SMS Parser for bKash, Nagad, Rocket, Upay & Banks
export function parseSms(rawText: string, senderHint: string = ""): ParsedSms | null {
  if (!rawText || typeof rawText !== "string") return null;

  const raw = rawText.trim();
  const normalizedText = convertBengaliDigits(raw);
  const lowerHint = (senderHint + " " + normalizedText).toLowerCase();

  // 1. Detect Provider
  let provider: ParsedSms["provider"] = "unknown";
  if (lowerHint.includes("bkash") || lowerHint.includes("16247") || lowerHint.includes("বিকাশ")) {
    provider = "bkash";
  } else if (lowerHint.includes("nagad") || lowerHint.includes("16167") || lowerHint.includes("নগদ")) {
    provider = "nagad";
  } else if (lowerHint.includes("rocket") || lowerHint.includes("16216") || lowerHint.includes("dbbl") || lowerHint.includes("রকেট")) {
    provider = "rocket";
  } else if (lowerHint.includes("upay") || lowerHint.includes("16268") || lowerHint.includes("উপায়")) {
    provider = "upay";
  } else if (lowerHint.includes("received tk") || lowerHint.includes("trxid")) {
    provider = "bkash"; // Default to bKash if standard bKash pattern
  } else if (lowerHint.includes("txnid") || lowerHint.includes("payment received")) {
    provider = "nagad"; // Default to Nagad if standard Nagad pattern
  }

  // 2. Extract Transaction ID (TrxID / TxnID / TxnId / Trx ID / Ref)
  let trxId: string | null = null;
  const trxMatch = normalizedText.match(
    /(?:TrxID|TxnID|TxnId|Txn ID|Trx ID|Trans ID|Transaction ID|ID)[\s:=]+([A-Za-z0-9_-]{6,32})/i
  );
  if (trxMatch && trxMatch[1]) {
    trxId = trxMatch[1].trim().toUpperCase();
  } else {
    // Check if plain TrxID pattern like 9K38LS92 or BLA72KS1
    const standaloneMatch = normalizedText.match(/\b([A-Z0-9]{8,14})\b/);
    if (standaloneMatch && !standaloneMatch[1].startsWith("01") && !standaloneMatch[1].startsWith("880")) {
      trxId = standaloneMatch[1].trim().toUpperCase();
    }
  }

  // 3. Extract Amount (Tk 500.00, Tk. 500, Amount: Tk 500, BDT 500, ৫০০ টাকা)
  let amount: number | null = null;
  const amountMatch = normalizedText.match(
    /(?:Amount\s*[:=]?\s*)?(?:Tk\.?|BDT|টাকা)\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  } else {
    // Try matching pattern "([\d,]+(?:\.\d{1,2})?)\s*(?:Tk|টাকা)"
    const altAmount = normalizedText.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:Tk\.?|BDT|টাকা)/i);
    if (altAmount && altAmount[1]) {
      amount = parseFloat(altAmount[1].replace(/,/g, ""));
    }
  }

  // 4. Extract Sender Phone
  let senderPhone: string | null = null;
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
    detectedAt: new Date().toISOString()
  };
}

// 2. Settings Management
export function getSmsSettings(): SmsSettings {
  ensureDataDir();
  const defaultSettings: SmsSettings = {
    enabled: true,
    secretKey: "sn777_auto_verify",
    autoApprove: true,
    allowAdminManualPaste: true,
    updatedAt: new Date().toISOString()
  };

  try {
    if (fs.existsSync(SMS_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SMS_SETTINGS_FILE, "utf8"));
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn("[getSmsSettings] Error reading settings:", e);
  }

  return defaultSettings;
}

export function saveSmsSettings(settings: Partial<SmsSettings>): SmsSettings {
  ensureDataDir();
  const current = getSmsSettings();
  const updated: SmsSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(SMS_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf8");
  } catch (e) {
    console.error("[saveSmsSettings] Error writing settings:", e);
  }

  return updated;
}

// 3. SMS Logs Management
export function getSmsLogs(): SmsLog[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SMS_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(SMS_LOGS_FILE, "utf8")) || [];
    }
  } catch (e) {
    console.warn("[getSmsLogs] Error reading logs:", e);
  }
  return [];
}

export function saveSmsLog(log: SmsLog): void {
  ensureDataDir();
  try {
    const logs = getSmsLogs();
    logs.unshift(log);
    // Keep last 500 logs for history
    const trimmed = logs.slice(0, 500);
    fs.writeFileSync(SMS_LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("[saveSmsLog] Error writing log:", e);
  }
}

// 4. Verified SMS Pool Management
export function getVerifiedSmsPool(): VerifiedSmsPoolItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SMS_POOL_FILE)) {
      return JSON.parse(fs.readFileSync(SMS_POOL_FILE, "utf8")) || [];
    }
  } catch (e) {
    console.warn("[getVerifiedSmsPool] Error reading pool:", e);
  }
  return [];
}

export function saveVerifiedSmsPool(pool: VerifiedSmsPoolItem[]): void {
  ensureDataDir();
  try {
    // Keep last 500 items
    const trimmed = pool.slice(0, 500);
    fs.writeFileSync(SMS_POOL_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("[saveVerifiedSmsPool] Error writing pool:", e);
  }
}

export function addToVerifiedPool(item: Omit<VerifiedSmsPoolItem, "claimed">): VerifiedSmsPoolItem {
  const pool = getVerifiedSmsPool();
  const cleanTrxId = item.trxId.toUpperCase().trim();

  // Check if already in pool
  const existingIdx = pool.findIndex((x) => x.trxId.toUpperCase() === cleanTrxId);
  const newItem: VerifiedSmsPoolItem = {
    ...item,
    trxId: cleanTrxId,
    claimed: false
  };

  if (existingIdx >= 0) {
    // If already exists and claimed, keep claimed status
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

export function findMatchingSmsInPool(trxId: string, requestedAmount?: number): VerifiedSmsPoolItem | null {
  if (!trxId) return null;
  const cleanTrxId = String(trxId).trim().toUpperCase();
  const pool = getVerifiedSmsPool();

  const found = pool.find((item) => {
    if (item.claimed) return false;
    if (item.trxId.toUpperCase() !== cleanTrxId) return false;

    // If requestedAmount is provided and non-zero, verify amount match (or tolerance)
    if (requestedAmount && requestedAmount > 0) {
      if (item.amount && item.amount !== requestedAmount) {
        console.log(`[SMS Pool] TrxID matched (${cleanTrxId}) but amount differed: pool=${item.amount}, requested=${requestedAmount}`);
      }
    }
    return true;
  });

  return found || null;
}

export function claimPoolSms(trxId: string, orderNo: string, uid: string): boolean {
  if (!trxId) return false;
  const cleanTrxId = String(trxId).trim().toUpperCase();
  const pool = getVerifiedSmsPool();

  const idx = pool.findIndex((item) => item.trxId.toUpperCase() === cleanTrxId);
  if (idx >= 0) {
    pool[idx].claimed = true;
    pool[idx].claimedAt = new Date().toISOString();
    pool[idx].claimedOrderNo = orderNo;
    pool[idx].claimedByUid = uid;
    saveVerifiedSmsPool(pool);
    return true;
  }

  return false;
}
