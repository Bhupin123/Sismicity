import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore,
  enableIndexedDbPersistence,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

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
export const db   = getFirestore(app);

// ── Enable offline persistence so writes are instant even without network ──
// Firestore caches writes locally and syncs when connected
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence unavailable: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser')
  }
})

// ══════════════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ══════════════════════════════════════════════════════════════════════

export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName });
    // setDoc with merge — never fails even if doc exists
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName,
      createdAt: new Date().toISOString(),
      alertsEnabled: false,
      alertMagnitude: 5.0,
      alertRadius: 100,
      userLat: null,
      userLon: null,
    }, { merge: true });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
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

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ══════════════════════════════════════════════════════════════════════
//  USER PREFERENCES
// ══════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════
//  ALERT SUBSCRIPTIONS
//  Uses setDoc with merge — with offline persistence enabled above,
//  this writes to local IndexedDB instantly and syncs to server later.
//  The UI resolves immediately regardless of network speed.
// ══════════════════════════════════════════════════════════════════════

export const subscribeToAlerts = async (userId, alertSettings) => {
  try {
    // This resolves from local cache instantly thanks to enableIndexedDbPersistence
    await setDoc(doc(db, 'users', userId), {
      alertsEnabled:  true,
      alertMagnitude: alertSettings.magnitude,
      alertRadius:    alertSettings.radius,
      userLat:        alertSettings.lat,
      userLon:        alertSettings.lon,
      updatedAt:      new Date().toISOString()
    }, { merge: true });

    // Non-blocking backend sync
    const user = auth.currentUser;
    if (user) {
      fetch('http://localhost:8000/api/alerts/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, email: user.email, ...alertSettings })
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    console.error('subscribeToAlerts error:', error);
    return { success: false, error: error.message };
  }
};

export const unsubscribeFromAlerts = async (userId) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      alertsEnabled: false,
      updatedAt:     new Date().toISOString()
    }, { merge: true });

    fetch('http://localhost:8000/api/alerts/unsubscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId })
    }).catch(() => {});

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════════════════════════════
//  EARTHQUAKE HISTORY
// ══════════════════════════════════════════════════════════════════════

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

export default {
  auth, db,
  registerUser, loginUser, logoutUser, onAuthChange,
  getUserPreferences, updateUserPreferences,
  subscribeToAlerts, unsubscribeFromAlerts,
  saveEarthquakeView, getUserHistory
};