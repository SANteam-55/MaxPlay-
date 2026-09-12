import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, getDoc, doc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "content"), limit(3));
  const snap = await getDocs(q);
  snap.forEach(d => {
    console.log("-------------------");
    console.log("ID:", d.id);
    const data = d.data();
    console.log("Title:", data.title);
    console.log("Type:", data.type);
    console.log("availableLanguages:", data.availableLanguages);
    console.log("videoLinks:", JSON.stringify(data.videoLinks, null, 2));
    console.log("videoSources:", JSON.stringify(data.videoSources, null, 2));
    console.log("seasonsData:", data.seasonsData ? "Exists" : "None");
  });
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
