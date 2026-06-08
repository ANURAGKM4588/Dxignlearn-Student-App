const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDAhD8X6zf9ie7g4QLBLHRanyroHgFNO_8",
  authDomain: "dxign-website.firebaseapp.com",
  projectId: "dxign-website",
  storageBucket: "dxign-website.firebasestorage.app",
  messagingSenderId: "1040678210662",
  appId: "1:1040678210662:web:d2644212f09e853b04f1a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const messagesSnap = await getDocs(collection(db, 'chats', 'test_gmail_com', 'messages'));
    console.log(`Total Messages found: ${messagesSnap.size}`);
    messagesSnap.forEach(msgDoc => {
      const data = msgDoc.data();
      console.log(`- ID: ${msgDoc.id}, Type: ${data.type}`);
      console.log(`  FileUrl: ${data.fileUrl || 'N/A'}`);
      console.log(`  Timestamp:`, data.timestamp);
    });
  } catch (err) {
    console.error("Error reading Firestore:", err);
  }
}

run();
