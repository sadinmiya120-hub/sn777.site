const admin = require("firebase-admin");
const serviceAccount = require("./firebase-applet-config.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const uid = "TESTUSER123";
const order_no = "ORD_TEST_" + Date.now();

async function run() {
  console.log("Creating doc...");
  await db.collection("transactions").doc(order_no).set({
    uid,
    order_no,
    status: "pending",
    amount: 100
  });

  console.log("Listening...");
  db.collection("transactions").where("uid", "==", uid).onSnapshot(snap => {
    snap.docs.forEach(d => {
      console.log("Snapshot update:", d.data().status);
    });
  });

  setTimeout(async () => {
    console.log("Rejecting via admin API mock...");
    await db.collection("transactions").doc(order_no).set({
      status: "rejected"
    }, { merge: true });
  }, 2000);
}
run();
