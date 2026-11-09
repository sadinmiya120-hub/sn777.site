const fs = require('fs');

// 1. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Insert getDepositFinalCredit helper if not present
if (!serverCode.includes('function getDepositFinalCredit(')) {
  const bonusHelper = `
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

  // Automatic tier match from bonus options (550, 1000, 2000, 5000, 10000, 15000, 20000, 25000 get 100% bonus)
  if (bonusPercent === 0) {
    if (deposit === 550 || deposit >= 1000) {
      bonusPercent = 100;
    }
  }

  const bonusAmount = Math.round(deposit * (bonusPercent / 100));
  const finalCredit = deposit + bonusAmount;
  return { finalCredit, bonusAmount };
}
`;
  serverCode = bonusHelper + "\n" + serverCode;
}

// Update approveAndCreditDeposit amount calculation
const oldAmtLine = 'let amount = paidAmountOverride || Number(existingLocal?.amount) || 0;';
const newAmtLine = `let paidDepAmount = paidAmountOverride || Number(existingLocal?.amount) || 0;
  let bonusAmt = Number(existingLocal?.bonusAmount) || Number(existingLocal?.bonus) || Number(depData?.bonusAmount) || Number(depData?.bonus) || 0;
  let storedFinalCredit = Number(existingLocal?.finalCredit) || Number(depData?.finalCredit) || 0;
  let calcRes = getDepositFinalCredit(paidDepAmount, existingLocal?.bonusOption || depData?.bonusOption, storedFinalCredit);
  let amount = Math.max(paidAmountOverride || 0, paidDepAmount, storedFinalCredit, calcRes.finalCredit, paidDepAmount + bonusAmt);`;

if (serverCode.includes(oldAmtLine)) {
  serverCode = serverCode.replace(oldAmtLine, newAmtLine);
}

// Update /api/create-payment in server.ts
const oldCreateTx = `const pendingTx = {
      id: order_no,
      order_no: order_no,
      orderId: order_no,
      depositNo: order_no,
      serialNo: order_no,
      doc_id: order_no,
      transactionId: order_no,
      uid: effectiveUid,
      username: username || effectiveUid,
      phone: phone,
      userPhone: phone,
      accountNumber: phone,
      type: "deposit",
      amount: amount,
      finalCredit: amount,`;

const newCreateTx = `const rawBonusOption = String(req.query.bonusOption || req.body?.bonusOption || req.query.promotion || req.body?.promotion || req.query.bonus || req.body?.bonus || "").trim();
    const explicitBonus = parseFloat(String(req.query.bonusAmount || req.body?.bonusAmount || req.query.finalCredit || req.body?.finalCredit || 0)) || 0;
    const calcBonus = getDepositFinalCredit(amount, rawBonusOption, explicitBonus);
    const depositFinalCredit = calcBonus.finalCredit;
    const depositBonusAmt = calcBonus.bonusAmount;

    const pendingTx = {
      id: order_no,
      order_no: order_no,
      orderId: order_no,
      depositNo: order_no,
      serialNo: order_no,
      doc_id: order_no,
      transactionId: order_no,
      uid: effectiveUid,
      username: username || effectiveUid,
      phone: phone,
      userPhone: phone,
      accountNumber: phone,
      type: "deposit",
      amount: amount,
      bonusAmount: depositBonusAmt,
      bonusOption: rawBonusOption || (depositBonusAmt > 0 ? "100% Deposit Bonus" : "No Bonus"),
      finalCredit: depositFinalCredit,
      displayAmount: depositFinalCredit,`;

if (serverCode.includes(oldCreateTx)) {
  serverCode = serverCode.replace(oldCreateTx, newCreateTx);
}

fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log("Updated server.ts with deposit bonus calculation!");

// 2. Update frontend bundle index-sn777-v10.js in all asset directories
const assetFiles = [
  'dist_backup/assets/index-sn777-v10.js',
  'dist/assets/index-sn777-v10.js',
  'app/applet/dist_backup/assets/index-sn777-v10.js',
  'app/applet/dist/assets/index-sn777-v10.js'
];

assetFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let js = fs.readFileSync(filePath, 'utf8');
    
    // Replace _newDepTx definition in Kr function
    const oldTxPattern = 'const _newDepTx={  id:Te,order_no:Te,orderId:Te,depositNo:Te,serialNo:Te,  uid:(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""),username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone,  type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",';
    
    const newTxPattern = 'let _bAmt=0;if(E===550||E>=1000){_bAmt=E;}const _finCred=E+_bAmt;const _newDepTx={  id:Te,order_no:Te,orderId:Te,depositNo:Te,serialNo:Te,  uid:(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""),username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone,  type:"deposit",amount:E,bonusAmount:_bAmt,finalCredit:_finCred,displayAmount:_finCred,method:Be,status:"pending",';

    if (js.includes(oldTxPattern)) {
      js = js.replace(oldTxPattern, newTxPattern);
    } else {
      // Flexible replacement for finalCredit:E inside deposit creation
      js = js.replace(/amount:E,finalCredit:E,/g, 'amount:E,bonusAmount:(E===550||E>=1000?E:0),finalCredit:(E===550||E>=1000?E*2:E),');
    }

    // Replace _gopayUrl creation to include bonusAmount & finalCredit
    const oldUrlPattern = '&amount="+encodeURIComponent(E)+"&method=';
    const newUrlPattern = '&amount="+encodeURIComponent(E)+"&bonusAmount="+encodeURIComponent(E===550||E>=1000?E:0)+"&finalCredit="+encodeURIComponent(E===550||E>=1000?E*2:E)+"&method=';
    if (js.includes(oldUrlPattern)) {
      js = js.replaceAll(oldUrlPattern, newUrlPattern);
    }

    fs.writeFileSync(filePath, js, 'utf8');
    console.log(`Updated ${filePath}!`);
  }
});
