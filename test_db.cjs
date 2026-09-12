const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  for (const d of snap.docs) {
    const data = d.data();
    // Overwrite ALL video URLs to be Big Buck Bunny so the user can test the player itself
    await updateDoc(doc(db, 'content', d.id), {
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      qualityLinks: {
        '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      },
      videoSources: {
        'Hindi': { '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
        'English': { '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
      }
    });
  }
  console.log("Updated " + snap.docs.length + " documents.");
  process.exit(0);
}
main();
