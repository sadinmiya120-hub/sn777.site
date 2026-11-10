import crypto from "crypto";

export const GOPAY_APP_ID = process.env.GOPAY_APP_ID || "GP_47479521";
export const GOPAY_SECRET_KEY = process.env.GOPAY_SECRET_KEY || "77a2d3a02360d495a1b07abfe5b196e8";
export const GOPAY_API_URL = "https://mch.go-pay.cyou/pay.php";

let lastOrderIdTime = 0;

export function generateCleanOrderId(customOrderNo?: string): string {
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

export function formatGoPayOrderDate(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Calculates MD5 Hex signature according to GoPay Pay-in specification:
 * 1. Omit sign, sign_type, and signtype keys (and empty/null values)
 * 2. Sort all parameter keys alphabetically in ascending order (ksort)
 * 3. Format as: key1=value1&key2=value2...&key={secret_key}
 * 4. Compute lowercase MD5 cryptographic digest hash
 */
export function calculateGoPaySignDetails(params: Record<string, any>, secretKey: string = GOPAY_SECRET_KEY): { sign: string; signStr: string } {
  const keys = Object.keys(params)
    .filter(k => {
      const lower = k.toLowerCase();
      if (lower === "sign" || lower === "sign_type" || lower === "signtype") return false;
      const v = params[k];
      return v !== undefined && v !== null && String(v).trim() !== "";
    })
    .sort();

  const parts = keys.map(k => `${k}=${params[k]}`);
  const signStr = parts.join("&") + `&key=${secretKey}`;
  const sign = crypto.createHash("md5").update(signStr, "utf8").digest("hex").toLowerCase();
  return { sign, signStr };
}

export function generateGoPaySign(params: Record<string, any>, secretKey: string = GOPAY_SECRET_KEY): string {
  return calculateGoPaySignDetails(params, secretKey).sign;
}

/**
 * Builds the complete signed parameter set for GoPay capture request
 */
export function buildGoPayPayload(options: {
  app_id?: string;
  secret_key?: string;
  order_no?: string;
  trade_amount: number;
  pay_type?: string;
  goods_name?: string;
  notify_url?: string;
  page_url?: string;
  mch_return_msg?: string;
  order_date?: string;
}) {
  const appId = options.app_id || GOPAY_APP_ID;
  const secretKey = options.secret_key || GOPAY_SECRET_KEY;
  const orderNo = options.order_no || generateCleanOrderId();
  const tradeAmount = Math.round(Number(options.trade_amount) || 200);

  const rawMethod = (options.goods_name || "").toUpperCase();
  const isNagad = rawMethod.includes("NAGAD") || options.pay_type === "2201";

  const payType = isNagad ? "2201" : "2202";
  const goodsName = isNagad ? "NAGAD" : "BKASH";
  const notifyUrl = options.notify_url || "https://sn777.site/gopay_notify.php";
  const pageUrl = options.page_url || `https://sn777.site/return?order_no=${encodeURIComponent(orderNo)}`;
  const mchReturnMsg = options.mch_return_msg || `user_${Date.now()}`;
  const orderDate = options.order_date || formatGoPayOrderDate();

  const rawParams: Record<string, any> = {
    app_id: appId,
    mch_order_no: orderNo,
    trade_amount: tradeAmount, // Integer
    pay_type: payType,
    goods_name: goodsName,
    notify_url: notifyUrl,
    page_url: pageUrl,
    mch_return_msg: mchReturnMsg,
    order_date: orderDate
  };

  const { sign, signStr } = calculateGoPaySignDetails(rawParams, secretKey);

  const fullParams: Record<string, any> = {
    ...rawParams,
    sign: sign,
    sign_type: "MD5"
  };

  const urlEncodedBody = new URLSearchParams();
  Object.keys(fullParams).sort().forEach(k => {
    urlEncodedBody.append(k, String(fullParams[k]));
  });

  return {
    rawParams,
    fullParams,
    sign,
    signStr,
    urlEncodedBody: urlEncodedBody.toString(),
    orderNo,
    tradeAmount,
    payType,
    goodsName
  };
}

/**
 * Sends real HTTP POST to GoPay capture endpoint
 */
export async function sendGoPayCaptureRequest(payload: ReturnType<typeof buildGoPayPayload>) {
  const startTime = Date.now();
  try {
    const res = await fetch(GOPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GoPayIntegration/1.0"
      },
      body: payload.urlEncodedBody,
      signal: AbortSignal.timeout(15000)
    });

    const elapsed = Date.now() - startTime;
    const httpStatus = res.status;
    const resText = await res.text();

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(resText);
    } catch (e) {}

    const isSuccess = parsedJson?.respCode === "SUCCESS";
    const payUrl = parsedJson?.payUrl || parsedJson?.pay_url || parsedJson?.payInfo || parsedJson?.url || null;

    return {
      success: isSuccess,
      httpStatus,
      elapsedMs: elapsed,
      rawResponse: resText,
      parsedJson,
      payUrl,
      tradeNo: parsedJson?.tradeNo || null,
      tradeMsg: parsedJson?.tradeMsg || (httpStatus === 523 ? "Cloudflare 523: Origin is unreachable" : `HTTP ${httpStatus}`)
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      httpStatus: 0,
      elapsedMs: elapsed,
      rawResponse: err?.message || String(err),
      parsedJson: null,
      payUrl: null,
      tradeNo: null,
      tradeMsg: `Connection error: ${err?.message || "Timeout or unreachable"}`
    };
  }
}
