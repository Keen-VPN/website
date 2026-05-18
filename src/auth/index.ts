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
  loginWithFirebaseToken,
  verifySessionToken,
  requestMagicLink,
  verifyMagicLink,
  getContactEmailStatus,
  saveContactEmail,
  skipContactEmailPrompt,
  sendContactEmailVerification,
  confirmContactEmailVerification,
  requestEmailOtp,
  verifyEmailOtp,
  fetchSubscriptionStatusWithSession,
  cancelSubscription,
  previewRetentionWinbackOffer,
  reactivateRetentionWinbackOffer,
  createCheckoutSession,
  createBillingPortalSession,
  deleteAccount,
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
  linkProvider,
  getLinkedProviders,
  fetchMembershipTransferRequest,
  submitMembershipTransferRequest,
  adminLogin,
  adminLogout,
  adminFetchMe,
  adminFetchUsersOverview,
  adminCreateUser,
  adminUpdateOwnPassword,
  adminListTransferRequests,
  adminListSubscriptions,
  adminRetriggerStripeCancelAtPeriodEnd,
  adminFetchTransferProofBlob,
  adminFetchTransferProofView,
  adminApproveTransferRequest,
  adminRejectTransferRequest,
} from './backend';

export type {
  MembershipTransferRequestData,
  AdminMe,
  AdminUserOverview,
  AdminSubscriptionListItem,
  AdminRetriggerStripeCancelResponse,
  CreateAdminUserPayload,
} from './backend';

export {
  useDebounce
} from './hooks';

export type {
  SubscriptionData,
  TrialData,
  AuthState,
  BackendAuthResponse
} from './types';
