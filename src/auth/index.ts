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
  getEmailPreferences,
  updateEmailPreferences,
  getUserProfileInformation,
  updateUserProfileInformation,
  getSignupSourceStatus,
  updateSignupSource,
  adminFetchSignupSourceSummary,
  adminFetchUserProfileSummary,
  confirmContextualEmailUnsubscribe,
  sendContactEmailVerification,
  confirmContactEmailVerification,
  requestEmailOtp,
  verifyEmailOtp,
  fetchSubscriptionStatusWithSession,
  fetchReferralDashboard,
  fetchPerks,
  claimPerk,
  recordPerkEvent,
  upgradeSubscriptionToAnnual,
  recordSubscriptionProductEvent,
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
  PerkCategory,
  PerkItem,
  PerkAccessTier,
  PerksListPayload,
  ProfileQuestionOption,
  ProfileQuestion,
  UserProfileInformationResponse,
  SignupSourceOption,
  SignupSourceStatusResponse,
  AdminSignupSourceSummary,
  AdminUserProfileAnswerDistribution,
  AdminUserProfileQuestionSummary,
  AdminUserProfileSummary,
} from './backend';

export {
  useDebounce
} from './hooks';

export {
  POST_LOGIN_REDIRECT_PARAM,
  buildSignInUrl,
  capturePostLoginRedirectFromSearch,
  consumePostLoginRedirect,
  sanitizePostLoginRedirect,
} from './post-login-redirect';

export {
  RETENTION_WINBACK_TOKEN_STORAGE_KEY,
  clearRetentionWinbackTokenStorage,
  getRetentionWinbackTokenFromStorage,
  setRetentionWinbackTokenStorage,
} from './retention-winback-token';

export {
  REFERRAL_TOKEN_STORAGE_KEY,
  clearReferralTokenStorage,
  getReferralTokenFromStorage,
  setReferralTokenStorage,
} from './referral-token';

export type {
  SubscriptionData,
  TrialData,
  AuthState,
  BackendAuthResponse
} from './types';
