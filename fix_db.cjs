const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, 'content'));
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    let needsUpdate = false;
    let updates = {};

    if (data.seasonsData) {
      const newSeasons = data.seasonsData.map(s => ({
        ...s,
        episodes: s.episodes ? s.episodes.map(ep => ({
          ...ep,
          videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          qualityLinks: {
            '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
          },
          videoSources: {
            'Hindi': { '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
          }
        })) : []
      }));
      updates.seasonsData = newSeasons;
      needsUpdate = true;
    }

    if (data.episodesList) {
      const newEpisodes = data.episodesList.map(ep => ({
        ...ep,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        qualityLinks: {
          '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        },
        videoSources: {
          'Hindi': { '1080p': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
        }
      }));
      updates.episodesList = newEpisodes;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateDoc(doc(db, 'content', d.id), updates);
      count++;
    }
  }
  console.log("Deep updated " + count + " documents.");
  process.exit(0);
}
main();
