import admin from "firebase-admin";
import fs from "fs";
import path from "path";

async function checkUsers() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const dbId = config.firestoreDatabaseId;
  const projectId = config.projectId;

  const firebaseAdmin = (admin as any).default || admin;

  if (!firebaseAdmin.apps || !firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      projectId: projectId
    });
  }

  const db = (firebaseAdmin.firestore as any)();
  console.log(`Checking users in project: ${projectId}, databaseId: ${dbId}`);

  try {
    const snapshot = await db.collection("users").limit(10).get();
    console.log(`Total users found: ${snapshot.size}`);
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      console.log(`User ID: ${doc.id}, Username: ${data.username}, Email: ${data.email}, Phone: ${data.phone}, Password: ${data.password}`);
    });
  } catch (err: any) {
    console.error("Error checking users:", err.message);
  }
}

checkUsers();
