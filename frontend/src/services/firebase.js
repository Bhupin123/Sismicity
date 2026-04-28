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
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,   // ← FIXED: was persistentMultipleTabManager
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

// ── FIXED: persistentSingleTabManager never blocks on an IndexedDB lock.
// persistentMultipleTabManager acquires a shared lock across tabs.
// If another tab holds the lock (or it's stale), setDoc() hangs indefinitely.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(),
  }),
});

// ── Hard timeout wrapper for Firestore writes only ────────────────────────
const withFirestoreTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), ms)
    ),
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
//  HELPER — create user doc ONLY if it doesn't exist yet
// ══════════════════════════════════════════════════════════════════

const ensureUserDoc = async (user, extra = {}) => {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email:              user.email || '',
      displayName:        user.displayName || extra.displayName || '',
      phone:              user.phoneNumber || '',
      createdAt:          new Date().toISOString(),
      alertsEnabled:      false,
      alertMagnitude:     5.0,
      selectedMagnitudes: ['Moderate', 'Strong', 'Major'],
      alertRadius:        200,
      userLat:            27.7172,
      userLon:            85.3240,
      locationName:       'Kathmandu, Nepal',
      ...extra,
    });
  }
};

// ══════════════════════════════════════════════════════════════════
//  EMAIL / PASSWORD AUTH
// ══════════════════════════════════════════════════════════════════

export const registerUser = async (email, password, displayName) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    await updateProfile(user, { displayName });
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
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
    } else {
      await setDoc(ref, { email, displayName }, { merge: true });
    }
    return { success: true, user };
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

// ══════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

// ══════════════════════════════════════════════════════════════════
//  GOOGLE AUTH
// ══════════════════════════════════════════════════════════════════

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await ensureUserDoc(result.user);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

// ══════════════════════════════════════════════════════════════════
//  PHONE AUTH
// ══════════════════════════════════════════════════════════════════

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
    await ensureUserDoc(result.user);
    window.confirmationResult = null;
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

// ══════════════════════════════════════════════════════════════════
//  SIGN OUT
// ══════════════════════════════════════════════════════════════════

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
// ══════════════════════════════════════════════════════════════════

export const getUserPreferences = async (userId) => {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) return { success: true, data: snap.data() };
    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'users', userId),
        { ...preferences, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════════════════════════
//  ALERT SUBSCRIPTIONS
//
//  1. Firestore write — 8s hard timeout (singleTabManager makes this ~300ms normally)
//  2. Fire-and-forget POST to Render backend for SendGrid email
//     15s AbortController — Render free tier cold starts ~30s, never block UI
// ══════════════════════════════════════════════════════════════════

export const subscribeToAlerts = async (userId, alertSettings) => {
  try {
    const prefsToSave = {
      alertsEnabled:      true,
      alertMagnitude:     alertSettings.magnitude,
      selectedMagnitudes: alertSettings.selectedMagnitudes ?? [],
      alertRadius:        alertSettings.radius,
      userLat:            alertSettings.lat,
      userLon:            alertSettings.lon,
      locationName:       alertSettings.locationName ?? '',
      updatedAt:          new Date().toISOString(),
    };

    // ── Step 1: Save to Firestore with hard 8s timeout ────────────
    await withFirestoreTimeout(
      setDoc(doc(db, 'users', userId), prefsToSave, { merge: true }),
      8000
    );

    // ── Step 2: Notify backend for SendGrid (fire-and-forget) ──────
    const user = auth.currentUser;
    if (user) {
      const ctrl    = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 15000);
      fetch(`${API_URL}/api/alerts/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        .then(res => { clearTimeout(timeout); if (!res.ok) console.warn('[SeismoIQ] backend subscribe:', res.status); })
        .catch(err => { clearTimeout(timeout); if (err.name !== 'AbortError') console.warn('[SeismoIQ] backend unreachable:', err.message); });
    }

    return { success: true };
  } catch (error) {
    const msg = error.message === 'FIRESTORE_TIMEOUT'
      ? 'Connection too slow — check your network and try again'
      : error.message;
    return { success: false, error: msg };
  }
};

export const unsubscribeFromAlerts = async (userId) => {
  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'users', userId),
        { alertsEnabled: false, updatedAt: new Date().toISOString() },
        { merge: true }
      ),
      8000
    );
    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    fetch(`${API_URL}/api/alerts/unsubscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId }),
      signal:  ctrl.signal,
    }).catch(() => {}).finally(() => clearTimeout(timeout));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
  loginWithGoogle,
  sendPhoneOTP, verifyPhoneOTP,
  resetPassword,
  getUserPreferences, updateUserPreferences,
  subscribeToAlerts, unsubscribeFromAlerts,
  saveEarthquakeView, getUserHistory,
};