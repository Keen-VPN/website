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
  signInWithGooglePopupOnly,
  signInWithApplePopupOnly,
  type SignInResult,
  type AuthError
} from './firebase';

export {
  checkLinkProvider,
  confirmLinkProvider,
  type LinkProviderCheckResult,
  type LinkProviderConfirmResult,
} from './link-provider';

export {
  authenticateWithBackend,
  loginWithFirebaseToken,
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

