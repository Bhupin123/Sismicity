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
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || 'https://sismicity-1.onrender.com';

const firebaseConfig = {
  apiKey: "AIzaSyDewN-vqEEKOUwClI-WbF7Ghq4YKYiwMak",
  authDomain: "seismoiq-app.firebaseapp.com",
  projectId: "seismoiq-app",
  storageBucket: "seismoiq-app.firebasestorage.app",
  messagingSenderId: "560850378129",
  appId: "1:560850378129:web:82be1bb0665f85e34c8e30",
  measurementId: "G-K9DJMR4BE7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

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
    'expired-callback': () => { window.recaptchaVerifier = null; }
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
      ...extra
    });
  }
};

// ══════════════════════════════════════════════════════════════════
//  EMAIL / PASSWORD AUTH
// ══════════════════════════════════════════════════════════════════

export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName });

    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email:              user.email,
        displayName:        displayName,
        phone:              '',
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
      await setDoc(ref, {
        email:       user.email,
        displayName: displayName,
      }, { merge: true });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: friendlyError(error.code) };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
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
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider);
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
    if (!window.confirmationResult) {
      return { success: false, error: 'Session expired. Please request a new OTP.' };
    }
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

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ══════════════════════════════════════════════════════════════════
//  USER PREFERENCES
// ══════════════════════════════════════════════════════════════════

export const getUserPreferences = async (userId) => {
  try {
    const docRef  = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════════════════════════
//  ALERT SUBSCRIPTIONS
//
//  HOW THIS WORKS:
//  1. Write prefs to Firestore immediately — this is the source of truth.
//     Firestore SDK uses the local persistent cache so this is near-instant
//     even offline. The write is confirmed once the server acknowledges it.
//
//  2. Fire-and-forget a POST to the Render backend (for SendGrid email).
//     This uses a 15s AbortController timeout so a cold Render startup
//     (which can take ~30s) doesn't block the UI at all.
//     If the backend is unreachable, we still return { success: true }
//     because the Firestore write already succeeded.
//
//  DO NOT wrap this function in an external withTimeout() — the Firestore
//  setDoc is already optimistic and the fetch is already guarded internally.
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

    // ── Step 1: Write to Firestore (source of truth, uses local cache) ──
    // This should complete in < 1 second with persistent cache enabled.
    await setDoc(doc(db, 'users', userId), prefsToSave, { merge: true });

    // ── Step 2: Notify backend for SendGrid email (fire-and-forget) ──
    // 15s timeout — Render free tier can take ~30s cold start, so we
    // don't wait for it. The alert prefs are already saved above.
    const user = auth.currentUser;
    if (user) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
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
        signal: controller.signal,
      })
        .then(async (res) => {
          clearTimeout(timeout);
          if (!res.ok) {
            console.warn('[SeismoIQ] Backend subscribe responded:', res.status);
          }
        })
        .catch((err) => {
          clearTimeout(timeout);
          // AbortError = timed out, TypeError = network unreachable
          // Both are acceptable — Firestore write already succeeded.
          if (err.name !== 'AbortError') {
            console.warn('[SeismoIQ] Backend subscribe failed (non-blocking):', err.message);
          }
        });
    }

    return { success: true };
  } catch (error) {
    // Only reaches here if the Firestore setDoc itself failed
    console.error('[SeismoIQ] subscribeToAlerts Firestore error:', error);
    return { success: false, error: error.message };
  }
};

export const unsubscribeFromAlerts = async (userId) => {
  try {
    // Only flip the flag — never touch other prefs
    await setDoc(doc(db, 'users', userId), {
      alertsEnabled: false,
      updatedAt:     new Date().toISOString()
    }, { merge: true });

    // Fire-and-forget with 15s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(`${API_URL}/api/alerts/unsubscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId }),
      signal:  controller.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));

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
      userId:       userId,
      earthquakeId: earthquake.id,
      magnitude:    earthquake.mag,
      place:        earthquake.place,
      viewedAt:     new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserHistory = async (userId, limit = 10) => {
  try {
    const q = query(
      collection(db, 'user_views'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const history = [];
    querySnapshot.forEach((d) => {
      history.push({ id: d.id, ...d.data() });
    });
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
    'auth/invalid-email':            'Invalid email address.',
    'auth/user-disabled':            'This account has been disabled.',
    'auth/user-not-found':           'No account found with this email.',
    'auth/wrong-password':           'Incorrect password.',
    'auth/invalid-credential':       'Incorrect email or password.',
    'auth/email-already-in-use':     'An account with this email already exists.',
    'auth/weak-password':            'Password must be at least 6 characters.',
    'auth/too-many-requests':        'Too many attempts. Please try again later.',
    'auth/network-request-failed':   'Network error. Check your connection.',
    'auth/popup-closed-by-user':     'Sign-in popup was closed.',
    'auth/cancelled-popup-request':  'Another sign-in is in progress.',
    'auth/invalid-phone-number':     'Invalid phone number. Use format: +1234567890',
    'auth/invalid-verification-code':'Invalid OTP code. Please try again.',
    'auth/code-expired':             'OTP has expired. Please request a new one.',
    'auth/missing-phone-number':     'Please enter a phone number.',
    'auth/quota-exceeded':           'SMS quota exceeded. Try again later.',
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
  saveEarthquakeView, getUserHistory
};