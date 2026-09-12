const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  let count = 0;
  for (const document of snap.docs) {
    const data = document.data();
    const updatePayload = {};
    
    updatePayload.videoUrl = 'https://vjs.zencdn.net/v/oceans.mp4';
    
    if (data.qualityLinks && typeof data.qualityLinks === 'object') {
      const qCopy = { ...data.qualityLinks };
      for (const [q, url] of Object.entries(qCopy)) {
        qCopy[q] = 'https://vjs.zencdn.net/v/oceans.mp4';
      }
      updatePayload.qualityLinks = qCopy;
    }
    
    if (data.videoSources && typeof data.videoSources === 'object') {
      const sCopy = JSON.parse(JSON.stringify(data.videoSources));
      for (const lang of Object.keys(sCopy)) {
        if (sCopy[lang] && typeof sCopy[lang] === 'object') {
          for (const q of Object.keys(sCopy[lang])) {
            sCopy[lang][q] = 'https://vjs.zencdn.net/v/oceans.mp4';
          }
        }
      }
      updatePayload.videoSources = sCopy;
    }
    
    await updateDoc(doc(db, 'content', document.id), updatePayload);
    count++;
  }
  console.log(`Updated ${count} documents.`);
  process.exit(0);
}
main().catch(console.error);
