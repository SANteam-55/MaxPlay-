const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  if (snap.docs.length > 0) {
    const data = snap.docs[0].data();
    console.log(Object.keys(data));
  }
  process.exit(0);
}
main();
