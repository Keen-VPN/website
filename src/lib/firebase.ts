import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD-EbWk-A-MMDQIx_yW0HTBj9-tD3U9KzI",
  authDomain: "keenvpn-33217.firebaseapp.com",
  projectId: "keenvpn-33217",
  storageBucket: "keenvpn-33217.firebasestorage.app",
  messagingSenderId: "820512492104",
  appId: "1:820512492104:web:66cf560414114b02d2667d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();