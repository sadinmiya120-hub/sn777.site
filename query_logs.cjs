const admin = require("firebase-admin");
const config = require("./firebase-applet-config.json");
admin.initializeApp({
  projectId: config.projectId,
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();
db.settings({ databaseId: config.firestoreDatabaseId });
db.collection("gopay_logs").orderBy("timestamp", "desc").limit(5).get().then(snap => {
  if (snap.empty) { console.log("No gopay_logs found."); return; }
  snap.forEach(doc => {
    console.log(doc.id, "=>", JSON.stringify(doc.data(), null, 2));
  });
}).catch(console.error);
