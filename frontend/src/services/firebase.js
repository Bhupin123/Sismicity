import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || 'https://sismicity-1.onrender.com';

const firebaseConfig = {
  apiKey:            'AIzaSyDewN-vqEEKOUwClI-WbF7Ghq4YKYiwMak',
  authDomain:        'seismoiq-app.firebaseapp.com',
  projectId:         'seismoiq-app',
  storageBucket:     'seismoiq-app.firebasestorage.app',
  messagingSenderId: '560850378129',
  appId:             '1:560850378129:web:82be1bb0665f85e34c8e30',
  measurementId:     'G-K9DJMR4BE7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ─────────────────────────────────────────────────────────────────
//  Background Firestore sync — fires and forgets, never blocks UI.
//  Retries up to 5 times with increasing delays.
// ─────────────────────────────────────────────────────────────────
const RETRY_DELAYS = [3000, 6000, 12000, 24000, 48000];

const bgSync = (userId, data, attempt = 0) => {
  const payload = { ...data, updatedAt: new Date().toISOString() };

  Promise.race([
    setDoc(doc(db, 'users', userId), payload, { merge: true }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
  ])
    .then(() => {
      console.log('[SeismoIQ] synced to Firestore');
    })
    .catch((err) => {
      console.warn(`[SeismoIQ] sync attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < RETRY_DELAYS.length - 1) {
        setTimeout(() => bgSync(userId, data, attempt + 1), RETRY_DELAYS[attempt]);
      }
    });
};

// ─────────────────────────────────────────────────────────────────
//  Firestore read with timeout — used only for initial load
// ─────────────────────────────────────────────────────────────────
const readWithTimeout = (promise, ms = 10000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

// ══════════════════════════════════════════════════════════════════
//  RECAPTCHA
// ══════════════════════════════════════════════════════════════════

export const setupRecaptcha = (containerId) => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (_) {}
    window.recaptchaVerifier = null;
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { window.recaptchaVerifier = null; },
  });
  return window.recaptchaVerifier;
};

// ══════════════════════════════════════════════════════════════════
//  AUTH — EMAIL / GOOGLE / PHONE
// ══════════════════════════════════════════════════════════════════

export const registerUser = async (email, password, displayName) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    bgSync(cred.user.uid, {
      email, displayName, phone: '',
      createdAt:          new Date().toISOString(),
      alertsEnabled:      false,
      alertMagnitude:     5.0,
      selectedMagnitudes: ['Moderate', 'Strong', 'Major'],
      alertRadius:        200,
      userLat:            27.7172,
      userLon:            85.3240,
      locationName:       'Kathmandu, Nepal',
    });
    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const loginUser = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    // Ensure user doc exists — non-blocking
    readWithTimeout(getDoc(doc(db, 'users', result.user.uid)), 8000)
      .then(snap => {
        if (!snap.exists()) {
          bgSync(result.user.uid, {
            email:              result.user.email || '',
            displayName:        result.user.displayName || '',
            phone:              result.user.phoneNumber || '',
            createdAt:          new Date().toISOString(),
            alertsEnabled:      false,
            alertMagnitude:     5.0,
            selectedMagnitudes: ['Moderate', 'Strong', 'Major'],
            alertRadius:        200,
            userLat:            27.7172,
            userLon:            85.3240,
            locationName:       'Kathmandu, Nepal',
          });
        }
      })
      .catch(() => {});
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const sendPhoneOTP = async (phoneNumber, containerId) => {
  try {
    const appVerifier        = setupRecaptcha(containerId);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const verifyPhoneOTP = async (otp) => {
  try {
    if (!window.confirmationResult)
      return { success: false, error: 'Session expired. Please request a new OTP.' };
    const result = await window.confirmationResult.confirm(otp);
    window.confirmationResult = null;
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// ══════════════════════════════════════════════════════════════════
//  USER PREFERENCES
//  Read attempts Firestore with a 10s timeout.
//  On failure, Alerts.jsx falls back to localStorage — no hang.
// ══════════════════════════════════════════════════════════════════

export const getUserPreferences = async (userId) => {
  try {
    const snap = await readWithTimeout(getDoc(doc(db, 'users', userId)), 10000);
    if (snap.exists()) return { success: true, data: snap.data() };
    return { success: false, error: 'not found' };
  } catch {
    return { success: false, error: 'timeout' };
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  bgSync(userId, preferences);
  return { success: true };
};

// ══════════════════════════════════════════════════════════════════
//  ALERT SUBSCRIPTIONS
//
//  subscribeToAlerts is 100% OPTIMISTIC:
//  - Returns { success: true } instantly — no waiting
//  - Firestore write happens in the background via bgSync
//  - Backend email fires and forgets with 90s abort
//  The UI NEVER hangs or shows "Failed" due to network issues.
// ══════════════════════════════════════════════════════════════════

export const subscribeToAlerts = async (userId, alertSettings) => {
  const data = {
    alertsEnabled:      true,
    alertMagnitude:     alertSettings.magnitude,
    selectedMagnitudes: alertSettings.selectedMagnitudes ?? [],
    alertRadius:        alertSettings.radius,
    userLat:            alertSettings.lat,
    userLon:            alertSettings.lon,
    locationName:       alertSettings.locationName ?? '',
  };

  // Background Firestore sync — never blocks
  bgSync(userId, data);

  // Background backend call for SendGrid email — 90s for Render cold-start
  const user = auth.currentUser;
  if (user) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 90000);
    fetch(`${API_URL}/api/alerts/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        userId,
        email:              user.email,
        displayName:        user.displayName || '',
        magnitude:          alertSettings.magnitude,
        selectedMagnitudes: alertSettings.selectedMagnitudes,
        radius:             alertSettings.radius,
        lat:                alertSettings.lat,
        lon:                alertSettings.lon,
        locationName:       alertSettings.locationName,
      }),
      signal: ctrl.signal,
    })
      .then(res => { clearTimeout(t); if (!res.ok) console.warn('[SeismoIQ] backend:', res.status); })
      .catch(err => { clearTimeout(t); if (err.name !== 'AbortError') console.warn('[SeismoIQ] backend unreachable'); });
  }

  // Always succeeds immediately
  return { success: true };
};

export const unsubscribeFromAlerts = async (userId) => {
  bgSync(userId, { alertsEnabled: false });

  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 90000);
  fetch(`${API_URL}/api/alerts/unsubscribe`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId }),
    signal:  ctrl.signal,
  }).catch(() => {}).finally(() => clearTimeout(t));

  return { success: true };
};

// ══════════════════════════════════════════════════════════════════
//  EARTHQUAKE HISTORY
// ══════════════════════════════════════════════════════════════════

export const saveEarthquakeView = async (userId, earthquake) => {
  try {
    await addDoc(collection(db, 'user_views'), {
      userId, earthquakeId: earthquake.id,
      magnitude: earthquake.mag, place: earthquake.place,
      viewedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserHistory = async (userId, limit = 10) => {
  try {
    const snap = await getDocs(query(collection(db, 'user_views'), where('userId', '==', userId)));
    const history = [];
    snap.forEach(d => history.push({ id: d.id, ...d.data() }));
    return { success: true, data: history.slice(0, limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════════════════════════
//  FRIENDLY ERROR MESSAGES
// ══════════════════════════════════════════════════════════════════

function friendlyError(code) {
  const map = {
    'auth/invalid-email':             'Invalid email address.',
    'auth/user-disabled':             'This account has been disabled.',
    'auth/user-not-found':            'No account found with this email.',
    'auth/wrong-password':            'Incorrect password.',
    'auth/invalid-credential':        'Incorrect email or password.',
    'auth/email-already-in-use':      'An account with this email already exists.',
    'auth/weak-password':             'Password must be at least 6 characters.',
    'auth/too-many-requests':         'Too many attempts. Please try again later.',
    'auth/network-request-failed':    'Network error. Check your connection.',
    'auth/popup-closed-by-user':      'Sign-in popup was closed.',
    'auth/cancelled-popup-request':   'Another sign-in is in progress.',
    'auth/invalid-phone-number':      'Invalid phone number. Use format: +1234567890',
    'auth/invalid-verification-code': 'Invalid OTP code. Please try again.',
    'auth/code-expired':              'OTP has expired. Please request a new one.',
    'auth/missing-phone-number':      'Please enter a phone number.',
    'auth/quota-exceeded':            'SMS quota exceeded. Try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

export default {
  auth, db,
  registerUser, loginUser, logoutUser, onAuthChange,
  loginWithGoogle, sendPhoneOTP, verifyPhoneOTP, resetPassword,
  getUserPreferences, updateUserPreferences,
  subscribeToAlerts, unsubscribeFromAlerts,
  saveEarthquakeView, getUserHistory,
};