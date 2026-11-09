const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
if (!serviceAccount.private_key) {
  // If it's a client config, we can't use firebase-admin.
  console.log("No private_key in config.");
} else {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  admin.firestore().collection('deposits').where('status', '==', 'approved').limit(5).get().then(snap => {
    snap.forEach(doc => console.log(doc.id, doc.data()));
  }).catch(console.error);
}
