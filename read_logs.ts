import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let dbId: string | undefined;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    dbId = config.firestoreDatabaseId;
    console.log("Found firestoreDatabaseId in config:", dbId);
  }
} catch (e) {
  console.error("Failed to read firebase-applet-config.json:", e);
}

let adminApp;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  const serviceAccount = JSON.parse(serviceAccountKey);
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  adminApp = admin.initializeApp({
    projectId: "marklar-reducer-v5xj8"
  });
}

const db = dbId ? getFirestore(adminApp, dbId) : getFirestore(adminApp);
console.log("Querying deposits on custom firestore database...");
db.collection("deposits").orderBy("createdAt", "desc").limit(5).get()
  .then(snapshot => {
    console.log(`Found ${snapshot.docs.length} deposit documents in database.`);
    snapshot.forEach(doc => {
      console.log("-----------------------------------------");
      console.log("Deposit ID:", doc.id);
      console.log("Data:", JSON.stringify(doc.data(), null, 2));
    });
  })
  .catch(err => {
    console.error("Firestore error:", err);
  });



