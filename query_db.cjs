const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  snap.docs.slice(0, 3).forEach(doc => {
    const data = doc.data();
    console.log("ID:", doc.id);
    console.log("videoUrl:", data.videoUrl);
    console.log("qualityLinks:", data.qualityLinks);
    console.log("videoSources:", data.videoSources);
    console.log("videoLinks:", data.videoLinks);
  });
  process.exit(0);
}
main();
