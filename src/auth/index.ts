// Main exports for authentication
export {
  getFirebaseApp,
  getFirebaseAuth,
  initAuth,
  checkRedirectResult,
  signInWithGoogle,
  signInWithApple,
  signOut,
  onAuthStateChanged,
  getCurrentUser,
  getCurrentUserIdToken,
  createGoogleProvider,
  createAppleProvider,
  mapFirebaseError,
  isWebView,
  shouldUseRedirect,
  type SignInResult,
  type AuthError
} from './firebase';

export {
  authenticateWithBackend,
  verifySessionToken,
  cancelSubscription,
  createCheckoutSession,
  deleteAccount,
  storeSessionToken,
  getSessionToken,
  clearSessionToken
} from './backend';

export {
  useDebounce
} from './hooks';

export type {
  SubscriptionData,
  AuthState,
  BackendAuthResponse
} from './types';

