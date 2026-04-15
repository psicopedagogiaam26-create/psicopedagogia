import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ── Reemplazá estos valores con los de tu proyecto Firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyBCLEcsWt3HRwe7AdhYzyLfQjtzo6-w_zo",
  authDomain: "psicopedagogia-andrea.firebaseapp.com",
  projectId: "psicopedagogia-andrea",
  storageBucket: "psicopedagogia-andrea.firebasestorage.app",
  messagingSenderId: "598141790744",
  appId: "1:598141790744:web:63aadeb307f84c3b41316d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
