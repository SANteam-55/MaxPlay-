import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "content"), limit(2));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(doc.id, "=> type:", doc.data().type);
    console.log("videoLinks:", JSON.stringify(doc.data().videoLinks, null, 2));
    console.log("videoSources:", JSON.stringify(doc.data().videoSources, null, 2));
    console.log("seasonsData:", JSON.stringify(doc.data().seasonsData, null, 2));
  });
  process.exit(0);
}
run().catch(console.error);
