const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const cbStart = serverCode.indexOf('// GoPay Webhook Callback Notification');
if (cbStart !== -1) {
  const cbEnd = serverCode.indexOf('// Payment Return / Success Page', cbStart);
  if (cbEnd !== -1) {
    const updatedCb = `// GoPay Webhook Callback Notification (gopay_notify.php / callback.php / notify_url)
app.all(["/gopay_notify.php", "/callback.php", "/notify.php", "/gopay_callback.php", "/api/gopay-notify", "/api/gopay-callback", "/api/propay-callback"], async (req, res) => {
  try {
    const rawData = extractCallbackData(req);
    const secretKey = GOPAY_SECRET_KEY; // "77a2d3a02360d495a1b07abfe5b196e8"
    if (!rawData || Object.keys(rawData).length === 0) {
      console.warn("[GoPay Callback] Empty payload received");
      return res.send("fail");
    }

    // 1. Signature calculation as per gateway specification
    const signParams: Record<string, any> = { ...rawData };
    delete signParams["sign"];
    delete signParams["signType"];
    delete signParams["sign_type"];
    const sortedKeys = Object.keys(signParams).sort();
    let signStr = "";
    for (const k of sortedKeys) {
      const v = signParams[k];
      if (v !== "" && v !== null && v !== undefined) {
        signStr += \`\${k}=\${v}&\`;
      }
    }
    signStr += \`key=\${secretKey}\`;
    const calculatedSign = crypto.createHash("md5").update(signStr, "utf8").digest("hex").toLowerCase();
    const receivedSign = rawData.sign ? String(rawData.sign).toLowerCase().trim() : "";

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

    console.log(\`[GoPay Callback] Signature calc: \${calculatedSign}, recv: \${receivedSign}, match: \${calculatedSign === receivedSign}\`);
    console.log(\`[GoPay Callback] Capture for order: \${order_no}, amount: \${paidAmount}, tradeResult: \${tradeResult}, targetUid: \${targetUid}\`);

    if (order_no && isTradeSuccess) {
      await approveAndCreditDeposit(order_no, paidAmount, targetUid);
      // Handshake Acknowledgment: Must output exactly success in lowercase
      return res.send("success");
    }

    if (!isTradeSuccess) {
      return res.send("fail");
    }

    return res.send("success");
  } catch (err: any) {
    console.error("[GoPay Callback Error]:", err);
    return res.send("fail");
  }
});
`;
    serverCode = serverCode.substring(0, cbStart) + updatedCb + "\n" + serverCode.substring(cbEnd);
    fs.writeFileSync('server.ts', serverCode, 'utf8');
    console.log("Successfully updated callback route in server.ts!");
  }
}
