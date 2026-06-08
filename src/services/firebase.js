import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  limit 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Firebase Web Config (from Firebase Console -> Project Settings)
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Your Google Apps Script Webhook URL (used for Whitelist checking & sending free OTPs)
const APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbww2LgUDDxh7nSZy-fmAfeuTDBgPDjjY6xX66N2lmGoR1NCn6Vwx4RNd9WDYOliFyxq/exec";

/**
 * Checks if email is registered on the website, and requests a free OTP email via Apps Script.
 */
export async function requestOTP(email) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // TESTING MODE BYPASS
  if (normalizedEmail === 'test@gmail.com' || normalizedEmail === 'test@dxign.com' || normalizedEmail.endsWith('@dxign.com')) {
    return { success: true };
  }

  try {
    const response = await fetch(APPS_SCRIPT_WEBHOOK + "?action=send_otp&email=" + encodeURIComponent(normalizedEmail), {
      method: 'GET'
    });
    const result = await response.json();
    if (result.status === 'success') {
      return { success: true };
    } else {
      return { success: false, error: result.message || "This email is not registered for any courses." };
    }
  } catch (error) {
    console.error("Error requesting OTP:", error);
    return { success: false, error: "Network error. Please check your connection." };
  }
}

/**
 * Verifies the OTP entered by the student.
 * If correct, creates/obtains custom Firebase token and logs in.
 */
export async function verifyOTP(email, otp) {
  const normalizedEmail = email.toLowerCase().trim();

  // TESTING MODE BYPASS (Accepts '123456' for test emails)
  if ((normalizedEmail === 'test@gmail.com' || normalizedEmail === 'test@dxign.com' || normalizedEmail.endsWith('@dxign.com')) && otp === '123456') {
    const fallbackUser = {
      email: normalizedEmail,
      name: "Test Student",
      courses: ["Graphic Design", "Film Making", "Content Creation", "Vibe Coding", "Business Automation"]
    };
    await AsyncStorage.setItem('user_session', JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser };
  }

  try {
    const response = await fetch(APPS_SCRIPT_WEBHOOK + `?action=verify_otp&email=${encodeURIComponent(normalizedEmail)}&otp=${otp}`, {
      method: 'GET'
    });
    const result = await response.json();
    
    if (result.status === 'success') {
      // Firebase login: Apps Script returns a custom token or we can sign in using Firebase Auth.
      // To keep it 100% free and simple, we can sign in anonymously or use the custom token returned.
      // If we are using standard Firebase Email/Password, we can create a default account:
      // email: email, password: secret_app_passphrase
      // This is free and secure since we already verified the OTP.
      const token = result.firebaseCustomToken;
      if (token) {
        const userCredential = await signInWithCustomToken(auth, token);
        await AsyncStorage.setItem('user_session', JSON.stringify({
          email: normalizedEmail,
          name: result.name,
          courses: result.courses,
          uid: userCredential.user.uid
        }));
        return { success: true, user: userCredential.user };
      } else {
        // Fallback: local session authentication if Firebase Auth config is not complete
        const fallbackUser = { email: normalizedEmail, name: result.name, courses: result.courses };
        await AsyncStorage.setItem('user_session', JSON.stringify(fallbackUser));
        return { success: true, user: fallbackUser };
      }
    } else {
      return { success: false, error: result.message || "Incorrect OTP." };
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, error: "Network error during verification." };
  }
}

/**
 * Log out user from Firebase and delete local session cache.
 */
export async function logoutUser() {
  try {
    await fbSignOut(auth);
  } catch (e) {}
  await AsyncStorage.removeItem('user_session');
}

/**
 * Check if a session already exists locally.
 */
export async function checkLocalSession() {
  const sessionStr = await AsyncStorage.getItem('user_session');
  if (sessionStr) {
    return JSON.parse(sessionStr);
  }
  return null;
}
