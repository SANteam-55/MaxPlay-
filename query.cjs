const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, data.title, data.videoUrl, JSON.stringify(data.qualityLinks));
  });
  process.exit(0);
}
main();
