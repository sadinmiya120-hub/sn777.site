
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
