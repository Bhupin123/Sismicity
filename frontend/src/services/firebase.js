import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
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
//  Background Firestore sync
// ─────────────────────────────────────────────────────────────────
const RETRY_DELAYS = [3000, 6000, 12000, 24000, 48000];

const bgSync = (userId, data, attempt = 0) => {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  Promise.race([
    setDoc(doc(db, 'users', userId), payload, { merge: true }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
  ])
    .then(() => console.log('[SeismoIQ] synced to Firestore'))
    .catch((err) => {
      console.warn(`[SeismoIQ] sync attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < RETRY_DELAYS.length - 1)
        setTimeout(() => bgSync(userId, data, attempt + 1), RETRY_DELAYS[attempt]);
    });
};

const readWithTimeout = (promise, ms = 10000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

const defaultUserData = (user) => ({
  email:              user.email || '',
  displayName:        user.displayName || '',
  phone:              user.phoneNumber || '',
  createdAt:          new Date().toISOString(),
  alertsEnabled:      false,
  alertMagnitude:     5.0,
  selectedMagnitudes: ['Moderate', 'Strong', 'Major'],
  alertRadius:        200,
  userLat:            27.7172,
  userLon:            85.3240,
  locationName:       'Kathmandu, Nepal',
});

// ─────────────────────────────────────────────────────────────────
//  Detect strict browsers (Firefox, Safari, Brave)
// ─────────────────────────────────────────────────────────────────
const isStrictBrowser = () => {
  const ua = navigator.userAgent;
  return (
    (/Safari/.test(ua) && !/Chrome/.test(ua)) ||
    /Firefox/.test(ua) ||
    navigator.brave !== undefined
  );
};

// ─────────────────────────────────────────────────────────────────
//  Strip spaces from phone number before sending to Firebase
// ─────────────────────────────────────────────────────────────────
const cleanPhone = (phone) => {
  if (!phone) return '';
  return '+' + phone.replace(/\D/g, '');
};

// ══════════════════════════════════════════════════════════════════
//  RECAPTCHA — replaces DOM node entirely to avoid "already rendered"
// ══════════════════════════════════════════════════════════════════
let rcCounter = 0;

export const setupRecaptcha = (containerId) => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (_) {}
    window.recaptchaVerifier = null;
  }

  const existing = document.getElementById(containerId);
  if (!existing) throw new Error(`reCAPTCHA container #${containerId} not found`);

  // Replace with a brand-new element — reCAPTCHA tracks DOM nodes internally
  const newId  = `rc-${++rcCounter}`;
  const newDiv = document.createElement('div');
  newDiv.id = newId;
  existing.replaceWith(newDiv);

  window.recaptchaVerifier = new RecaptchaVerifier(auth, newId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { window.recaptchaVerifier = null; },
  });

  return window.recaptchaVerifier;
};

// ══════════════════════════════════════════════════════════════════
//  AUTH — EMAIL with verification
// ══════════════════════════════════════════════════════════════════
export const registerUser = async (email, password, displayName) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await sendEmailVerification(cred.user);
    bgSync(cred.user.uid, { ...defaultUserData(cred.user), email, displayName, phone: '' });
    await signOut(auth);
    return { success: true, needsVerification: true };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const loginUser = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return {
        success: false,
        error: 'Email not verified. A new verification link has been sent to your inbox.',
      };
    }
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

// ══════════════════════════════════════════════════════════════════
//  AUTH — GOOGLE (popup for Chrome, redirect for Firefox/Safari/Brave)
// ══════════════════════════════════════════════════════════════════
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    readWithTimeout(getDoc(doc(db, 'users', result.user.uid)), 8000)
      .then(snap => { if (!snap.exists()) bgSync(result.user.uid, defaultUserData(result.user)); })
      .catch(() => {});
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[SeismoIQ] redirect result error:', error.code);
    return { success: false, error: friendlyError(error.code) };
  }
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if (isStrictBrowser()) {
      await signInWithRedirect(auth, provider);
      return { success: true, user: null, redirecting: true };
    }

    const result = await signInWithPopup(auth, provider);
    readWithTimeout(getDoc(doc(db, 'users', result.user.uid)), 8000)
      .then(snap => { if (!snap.exists()) bgSync(result.user.uid, defaultUserData(result.user)); })
      .catch(() => {});
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[SeismoIQ] Google sign-in error:', error.code, error.message);
    return { success: false, error: friendlyError(error.code) };
  }
};

// ══════════════════════════════════════════════════════════════════
//  AUTH — PHONE OTP
//  Requires Firebase Blaze plan for real SMS
//  Test numbers added in Firebase Console work on free plan
// ══════════════════════════════════════════════════════════════════
export const sendPhoneOTP = async (phoneNumber, containerId) => {
  try {
    const cleaned = cleanPhone(phoneNumber);
    console.log('[SeismoIQ] sending OTP to:', cleaned);

    const appVerifier = setupRecaptcha(containerId);
    await appVerifier.render();
    const confirmationResult = await signInWithPhoneNumber(auth, cleaned, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true };
  } catch (error) {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (_) {}
      window.recaptchaVerifier = null;
    }
    console.error('[SeismoIQ] sendPhoneOTP error:', error.code, error.message);
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
  bgSync(userId, data);
  const user = auth.currentUser;
  if (user) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 90000);
    fetch(`${API_URL}/api/alerts/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, email: user.email, displayName: user.displayName || '',
        magnitude: alertSettings.magnitude,
        selectedMagnitudes: alertSettings.selectedMagnitudes,
        radius: alertSettings.radius, lat: alertSettings.lat,
        lon: alertSettings.lon, locationName: alertSettings.locationName,
      }),
      signal: ctrl.signal,
    })
      .then(res => { clearTimeout(t); if (!res.ok) console.warn('[SeismoIQ] backend:', res.status); })
      .catch(err => { clearTimeout(t); if (err.name !== 'AbortError') console.warn('[SeismoIQ] backend unreachable'); });
  }
  return { success: true };
};

export const unsubscribeFromAlerts = async (userId) => {
  bgSync(userId, { alertsEnabled: false });
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 90000);
  fetch(`${API_URL}/api/alerts/unsubscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }), signal: ctrl.signal,
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
    'auth/popup-closed-by-user':      'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request':   'Another sign-in is in progress.',
    'auth/popup-blocked':             'Popup blocked. Please allow popups for this site.',
    'auth/unauthorized-domain':       'This domain is not authorized in Firebase.',
    'auth/invalid-phone-number':      'Invalid phone number. Use format: +9779812345678',
    'auth/invalid-verification-code': 'Invalid OTP code. Please try again.',
    'auth/code-expired':              'OTP expired. Please request a new one.',
    'auth/missing-phone-number':      'Please enter a phone number.',
    'auth/quota-exceeded':            'SMS quota exceeded. Try again later.',
    'auth/billing-not-enabled':       'Phone sign-in is currently unavailable. Please use email or Google to sign in.',
    'auth/captcha-check-failed':      'reCAPTCHA failed. Please refresh and try again.',
    'auth/missing-verification-code': 'Please enter the OTP code.',
  };
  return map[code] || `Something went wrong (${code}). Please try again.`;
}

export default {
  auth, db,
  registerUser, loginUser, logoutUser, onAuthChange,
  loginWithGoogle, handleGoogleRedirectResult,
  sendPhoneOTP, verifyPhoneOTP, resetPassword,
  getUserPreferences, updateUserPreferences,
  subscribeToAlerts, unsubscribeFromAlerts,
  saveEarthquakeView, getUserHistory,
};