const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
admin.auth().getUserByEmail("suya120@sn777.com").then(u => {
  console.log("Auth UID:", u.uid);
  process.exit(0);
}).catch(console.error);
