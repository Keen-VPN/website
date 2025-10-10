import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';

// ============================================================================
// Configuration
// ============================================================================

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function loadFirebaseConfig(): FirebaseConfig {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Validate required fields
  const missing = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missing.join(', ')}. ` +
      `Please check your .env file and ensure all VITE_FIREBASE_* variables are set.`
    );
  }

  return config as FirebaseConfig;
}

// ============================================================================
// Initialization
// ============================================================================

let app: FirebaseApp;
let auth: Auth;
let isInitialized = false;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = loadFirebaseConfig();
    app = initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

/**
 * Initialize Firebase Auth with persistence and redirect result handling
 * Call this once on app startup before any auth operations
 */
export async function initAuth(): Promise<Auth> {
  if (isInitialized) {
    return getFirebaseAuth();
  }

  const authInstance = getFirebaseAuth();

  try {
    // Set persistence to local (survives browser restarts)
    await setPersistence(authInstance, browserLocalPersistence);
    isInitialized = true;
  } catch (error) {
    throw error;
  }

  return authInstance;
}

/**
 * Check for redirect result after sign-in redirect
 * Returns the sign-in result if redirect completed
 */
export async function checkRedirectResult(): Promise<SignInResult | null> {
  const authInstance = getFirebaseAuth();
  
  try {
    // Check if we were expecting a redirect
    const redirectPending = sessionStorage.getItem('auth_redirect_pending');
    const redirectTimestamp = sessionStorage.getItem('auth_redirect_timestamp');
    
    if (redirectPending) {
      // Clear the flags
      sessionStorage.removeItem('auth_redirect_pending');
      sessionStorage.removeItem('auth_redirect_timestamp');
    }
    
    const result = await getRedirectResult(authInstance);
    
    if (result) {
      // Try to get credential from either Google or Apple
      let credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential) {
        credential = OAuthProvider.credentialFromResult(result);
      }
      
      return {
        success: true,
        user: result.user,
        credential,
        accessToken: credential?.accessToken || credential?.idToken,
        usedRedirect: true
      };
    }
    
    // Check if user is authenticated but no redirect result
    // This can happen if redirect already processed
    if (authInstance.currentUser) {
      console.log('⚠️ User is authenticated but no redirect result');
      console.log('⚠️ This may mean redirect was already processed');
      console.log('⚠️ Current user:', authInstance.currentUser.email);
      
      // Try to get a fresh ID token
      try {
        const idToken = await authInstance.currentUser.getIdToken();
        console.log('✅ Got ID token for authenticated user');
        
        // Return a result so we can process this user
        return {
          success: true,
          user: authInstance.currentUser,
          credential: null,
          accessToken: idToken, // Use ID token as fallback
          usedRedirect: true
        };
      } catch (tokenError) {
        console.error('❌ Failed to get ID token:', tokenError);
      }
    }
    
    console.log('ℹ️ No redirect result (normal page load)');
    return null;
  } catch (error: any) {
    console.error('❌ Redirect result error:', error);
    const mappedError = mapFirebaseError(error);
    return {
      success: false,
      error: mappedError
    };
  }
}

// ============================================================================
// Providers
// ============================================================================

export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.setCustomParameters({
    prompt: 'select_account',
    display: 'popup'
  });
  return provider;
}

export function createAppleProvider(): OAuthProvider {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  provider.setCustomParameters({
    locale: 'en'
  });
  return provider;
}

// ============================================================================
// Error Mapping
// ============================================================================

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
}

export function mapFirebaseError(error: any): AuthError {
  const code = error?.code || 'unknown';
  const message = error?.message || 'Unknown error';

  const errorMap: Record<string, { userMessage: string; shouldRetry: boolean }> = {
    'auth/popup-closed-by-user': {
      userMessage: 'Sign-in window was closed. Please try again.',
      shouldRetry: true
    },
    'auth/cancelled-popup-request': {
      userMessage: 'Another sign-in is in progress. Please wait.',
      shouldRetry: false
    },
    'auth/popup-blocked': {
      userMessage: 'Pop-up was blocked by your browser. We\'ll use a redirect instead.',
      shouldRetry: true
    },
    'auth/unauthorized-domain': {
      userMessage: 'This domain is not authorized. Please contact support.',
      shouldRetry: false
    },
    'auth/network-request-failed': {
      userMessage: 'Network error. Please check your connection and try again.',
      shouldRetry: true
    },
    'auth/too-many-requests': {
      userMessage: 'Too many attempts. Please wait a moment and try again.',
      shouldRetry: true
    },
    'auth/internal-error': {
      userMessage: 'An internal error occurred. Please try again.',
      shouldRetry: true
    },
    'auth/invalid-credential': {
      userMessage: 'Invalid credentials. Please try signing in again.',
      shouldRetry: true
    },
    'auth/user-disabled': {
      userMessage: 'This account has been disabled. Please contact support.',
      shouldRetry: false
    },
    'auth/operation-not-allowed': {
      userMessage: 'This sign-in method is not enabled. Please contact support.',
      shouldRetry: false
    }
  };

  const mapped = errorMap[code] || {
    userMessage: 'An error occurred during sign-in. Please try again.',
    shouldRetry: true
  };

  return {
    code,
    message,
    ...mapped
  };
}

// ============================================================================
// Sign-In with Google (Popup with Redirect Fallback)
// ============================================================================

export interface SignInResult {
  success: boolean;
  user?: FirebaseUser;
  credential?: any;
  accessToken?: string;
  error?: AuthError;
  usedRedirect?: boolean;
}

/**
 * Generic sign-in function that works with any provider
 */
async function signInWithProvider(provider: GoogleAuthProvider | OAuthProvider, providerName: string): Promise<SignInResult> {
  const authInstance = getFirebaseAuth();

  try {
    console.log(`🔵 Attempting ${providerName} Sign-In with popup...`);
    console.log('🔵 Note: COOP warnings are normal and do not prevent sign-in');
    
    // Try popup first
    const result = await signInWithPopup(authInstance, provider);
    let credential;
    
    if (provider instanceof GoogleAuthProvider) {
      credential = GoogleAuthProvider.credentialFromResult(result);
    } else if (provider instanceof OAuthProvider) {
      credential = OAuthProvider.credentialFromResult(result);
    }
    
    
    // For Apple, we need to get the Firebase ID token instead
    let tokenToUse = credential?.accessToken || credential?.idToken;
    
    // If no token in credential (common with Apple), get Firebase ID token
    if (!tokenToUse && result.user) {
      tokenToUse = await result.user.getIdToken();
    }
    
    return {
      success: true,
      user: result.user,
      credential,
      accessToken: tokenToUse,
      usedRedirect: false
    };
  } catch (error: any) {
    const mappedError = mapFirebaseError(error);

    // Handle specific cases where we should fallback to redirect
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // Store a flag to indicate we're expecting a redirect
      sessionStorage.setItem('auth_redirect_pending', 'true');
      sessionStorage.setItem('auth_redirect_timestamp', Date.now().toString());
      
      try {
        await signInWithRedirect(authInstance, provider);
        // Redirect will happen, so we return a special result
        return {
          success: true,
          usedRedirect: true
        };
      } catch (redirectError: any) {
        sessionStorage.removeItem('auth_redirect_pending');
        sessionStorage.removeItem('auth_redirect_timestamp');
        const redirectMappedError = mapFirebaseError(redirectError);
        return {
          success: false,
          error: redirectMappedError
        };
      }
    }

    // For other errors, return the error
    return {
      success: false,
      error: mappedError
    };
  }
}

/**
 * Sign in with Google using popup, with automatic fallback to redirect
 * @returns SignInResult with user data or error information
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const provider = createGoogleProvider();
  return signInWithProvider(provider, 'Google');
}

/**
 * Sign in with Apple using popup, with automatic fallback to redirect
 * @returns SignInResult with user data or error information
 */
export async function signInWithApple(): Promise<SignInResult> {
  const provider = createAppleProvider();
  return signInWithProvider(provider, 'Apple');
}

// ============================================================================
// Sign Out
// ============================================================================

export async function signOut(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await firebaseSignOut(authInstance);
}

// ============================================================================
// Auth State Listener
// ============================================================================

export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void | Promise<void>
): () => void {
  const authInstance = getFirebaseAuth();
  return firebaseOnAuthStateChanged(authInstance, callback);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get current user's ID token
 */
export async function getCurrentUserIdToken(forceRefresh = false): Promise<string | null> {
  const authInstance = getFirebaseAuth();
  const user = authInstance.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    const token = await user.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    return null;
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  const authInstance = getFirebaseAuth();
  return authInstance.currentUser;
}

/**
 * Check if running in a webview/embedded browser
 */
export function isWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('wv') || // Android WebView
    ua.includes('webview') ||
    (ua.includes('iphone') && !ua.includes('safari')) || // iOS WebView
    (ua.includes('ipad') && !ua.includes('safari'))
  );
}

/**
 * Determine if we should use redirect instead of popup
 */
export function shouldUseRedirect(): boolean {
  return isWebView();
}

