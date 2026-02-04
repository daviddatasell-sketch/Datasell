/**
 * Firebase Authentication Module
 * Centralized Firebase config and auth functions for DataSell
 * Usage: import { auth, googleSignIn, checkAuth } from './js/firebase-auth.js'
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = window.__FIREBASE_CONFIG || {
  apiKey: "AIzaSyC_placeholder",
  authDomain: "datasell-7b993.firebaseapp.com",
  projectId: "datasell-7b993",
  storageBucket: "datasell-7b993.firebasestorage.app",
  databaseURL: "https://datasell-7b993-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google
 * @returns {Promise<{user: Object, idToken: string}>}
 */
export async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      },
      idToken: idToken
    };
  } catch (error) {
    console.error("Google sign-in error:", error);
    return {
      success: false,
      error: error.code,
      message: error.message
    };
  }
}

/**
 * Authenticate with backend using Firebase ID token
 * @param {string} idToken - Firebase ID token from Google sign-in
 * @param {Object} user - User data object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authenticateWithBackend(idToken, user) {
  try {
    const response = await fetch('/api/google-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: idToken,
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL
      })
    });
    
    const data = await response.json();
    return {
      success: data.success,
      error: data.error
    };
  } catch (error) {
    console.error("Backend authentication error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if user is authenticated (Firebase)
 * @returns {Promise<{authenticated: boolean, user: Object|null}>}
 */
export function checkAuthState() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve({
        authenticated: !!user,
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        } : null
      });
    });
  });
}

/**
 * Verify user session with backend
 * @returns {Promise<{success: boolean, authenticated: boolean}>}
 */
export async function verifySession() {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'include' });
    return await response.json();
  } catch (error) {
    console.error("Session verification error:", error);
    return { success: false, authenticated: false };
  }
}

/**
 * Sign out user from Firebase and backend
 * @returns {Promise<{success: boolean}>}
 */
export async function logout() {
  try {
    // Sign out from Firebase
    await signOut(auth);
    
    // Sign out from backend
    await fetch('/api/logout', { 
      method: 'POST', 
      credentials: 'include' 
    });
    
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Guard function - redirect to login if not authenticated
 * Checks both Firebase auth and backend session
 */
export async function requireAuth() {
  const firebaseAuth = await checkAuthState();
  
  if (!firebaseAuth.authenticated) {
    // Check backend session as fallback
    const session = await verifySession();
    if (!session.success || !session.authenticated) {
      window.location.href = '/login';
      return false;
    }
  }
  
  return true;
}

export default {
  auth,
  googleProvider,
  googleSignIn,
  authenticateWithBackend,
  checkAuthState,
  verifySession,
  logout,
  requireAuth
};
