import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set , get } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJoDrCxjXNC8LIXfBRagRk8OMPVW5Svhw",
  authDomain: "smartparking-842d1.firebaseapp.com",
  databaseURL: "https://smartparking-842d1-default-rtdb.firebaseio.com",
  projectId: "smartparking-842d1",
  storageBucket: "smartparking-842d1.firebasestorage.app",
  messagingSenderId: "92848743587",
  appId: "1:92848743587:web:62f6edca41ce8deeb54b16",
  measurementId: "G-L022W3618Q"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
export const auth = getAuth(app);

export { database, ref, onValue, set, get };