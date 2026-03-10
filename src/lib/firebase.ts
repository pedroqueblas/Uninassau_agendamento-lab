import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCla-FK4aLdHR_kv6q13IcXbk65cTA-n8M",
  authDomain: "agendamentolab-d004e.firebaseapp.com",
  projectId: "agendamentolab-d004e",
  storageBucket: "agendamentolab-d004e.firebasestorage.app",
  messagingSenderId: "313661786435",
  appId: "1:313661786435:web:8d1ff869587f56c12407f6",
  measurementId: "G-JPB65621LS",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
