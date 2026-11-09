import { getFirebaseAdmin } from "./server_clean";
const adminApp = getFirebaseAdmin();
adminApp.auth().getUserByEmail("suya120@sn777.com").then(u => {
  console.log("Auth UID:", u.uid);
  process.exit(0);
}).catch(console.error);
