/* eslint-disable no-console */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

import {
  signInWithGoogle,
  signInWithApple,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  mapFirebaseError,
  authenticateWithBackend,
  loginWithFirebaseToken,
  verifySessionToken,
  fetchSubscriptionStatusWithSession,
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
  getLinkedProviders,
  type SubscriptionData,
  type TrialData,
  type SignInResult
} from '@/auth';
import {
  consumePendingMembershipTransfer,
  getMembershipTransferReturnUrl,
} from "@/auth/membership-transfer-flow";

// ============================================================================
// Context Types
// ============================================================================

interface LinkedProviders {
  google: { linked: boolean; email?: string };
  apple: { linked: boolean; email?: string };
}

interface AuthContextType {
  user: FirebaseUser | null;
  subscription: SubscriptionData | null;
  trial: TrialData | null;
  loading: boolean;
  isAuthenticating: boolean;
  linkedProviders: LinkedProviders | null;
  hasSessionToken: boolean;
  /** Auth provider as stored by the backend (e.g. "google", "apple"). More reliable than Firebase providerData[0] for linked/merged accounts. */
  authProvider: string | null;
  signIn: (provider?: 'google' | 'apple') => Promise<{ success: boolean; shouldRedirect?: string }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshLinkedProviders: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProviders | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState<boolean>(() => Boolean(getSessionToken()));
  const [authProvider, _setAuthProvider] = useState<string | null>(
    () => localStorage.getItem('auth_provider') ?? sessionStorage.getItem('auth_provider')
  );
  const setAuthProvider = React.useCallback((provider: string | null) => {
    // Allow null (logout clears) and first-time set.
    // Once a non-null provider is stored, don't let backend responses
    // overwrite it — the backend returns the *registration* provider which
    // differs from the *sign-in* provider for linked accounts.
    // A fresh sign-in always goes through logout (null) first.
    if (provider !== null) {
      const current = localStorage.getItem('auth_provider');
      if (current) return; // already set — keep it
    }
    _setAuthProvider(provider);
    if (provider) {
      localStorage.setItem('auth_provider', provider);
      sessionStorage.setItem('auth_provider', provider);
    } else {
      localStorage.removeItem('auth_provider');
      sessionStorage.removeItem('auth_provider');
    }
  }, []);
  /** Guards against duplicate authenticateWithBackend calls (signIn + onAuthStateChanged or double-click). */
  const backendAuthInProgressRef = useRef(false);
  const { toast, dismiss: dismissToast } = useToast();

  // Check if user came from ASWebAuthenticationSession (macOS desktop app)
  const isASWebSession = React.useCallback(() => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('asweb') === '1') {
      return true;
    }
    // Check sessionStorage (set on page load)
    if (sessionStorage.getItem('asweb_session') === '1') {
      return true;
    }
    return false;
  }, []);

  const accountUrl = React.useCallback(
    () => (isASWebSession() ? '/account?asweb=1' : '/account'),
    [isASWebSession],
  );
  const postLoginUrl = React.useCallback(() => {
    if (consumePendingMembershipTransfer()) {
      return getMembershipTransferReturnUrl();
    }
    return accountUrl();
  }, [accountUrl]);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const fetchSubscriptionFromBackend = React.useCallback(async (sessionToken: string) => {
    try {
      const response = await fetchSubscriptionStatusWithSession(sessionToken);

      if (response.success) {
        setSubscription(response.subscription ?? null);
        setTrial(response.trial ?? null);
        return response.subscription;
      }
      if (response.unauthorized) {
        // Only clear auth state if the token we got a 401 for is still
        // the current session. A stale fire-and-forget call must never
        // sign out a newly established session.
        if (getSessionToken() === sessionToken) {
          clearSessionToken();
          setHasSessionToken(false);
          setAuthProvider(null);
          setUser(null);
          setSubscription(null);
          setTrial(null);
          try {
            await firebaseSignOut();
          } catch {
            // Ignore sign-out errors while clearing invalid auth state.
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [setAuthProvider]);

  const syncHasSessionToken = React.useCallback(() => {
    setHasSessionToken(Boolean(getSessionToken()));
  }, []);

  // ============================================================================
  // Initialize Auth State
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // Check if this is an ASWebAuthenticationSession request (macOS desktop app)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('asweb') === '1') {
        // Store flag in sessionStorage for later use (persists through redirects)
        sessionStorage.setItem('asweb_session', '1');
        console.info('🔐 ASWebAuthenticationSession detected - will auto-trigger deeplink after login');
      } else if (window.location.pathname === '/signin' && !sessionStorage.getItem('auth_redirect_pending')) {
        // Clear stale asweb_session when visiting /signin without ?asweb=1
        // and no redirect is in progress. Prevents normal signin from
        // incorrectly using the redirect flow.
        sessionStorage.removeItem('asweb_session');
      }

      // Also check if we already have the flag in sessionStorage (in case URL param was lost during redirect)
      // This ensures the flag persists even if Firebase redirects change the URL
      const existingFlag = sessionStorage.getItem('asweb_session');
      if (existingFlag === '1') {
        console.info('🔐 ASWebAuthenticationSession flag found in sessionStorage (persisted through redirect)');
      }

      // Step 1: Check for redirect result FIRST
      const { checkRedirectResult } = await import('@/auth');
      const redirectResult = await checkRedirectResult();

      if (redirectResult && redirectResult.success && redirectResult.user) {
        // Set user immediately so UI updates
        setUser(redirectResult.user);
        setLoading(false);

        const accessToken = redirectResult.accessToken;
        if (accessToken) {
          // Use provider from redirect result (derived from credential in firebase), not providerData[0] (wrong for linked accounts)
          const providerType = redirectResult.providerUsed ?? (redirectResult.appleIdentityToken ? 'apple' : 'google');
          const appleProviderData = providerType === 'apple' ? redirectResult.user.providerData?.find((p) => p?.providerId?.includes('apple')) : undefined;

          // For Apple, extract the actual Apple user identifier from the Apple provider entry
          if (providerType === 'apple') {
            console.log('🍎 Apple Sign-In - Full Provider Data:', {
              allProviderData: redirectResult.user.providerData,
              appleProvider: appleProviderData,
              firebaseUid: redirectResult.user.uid,
              email: redirectResult.user.email
            });
          }

          // Extract Apple user ID - try multiple approaches
          let appleUserId = redirectResult.user.uid; // fallback
          if (providerType === 'apple' && appleProviderData) {
            if (appleProviderData.uid && appleProviderData.uid !== redirectResult.user.uid) {
              appleUserId = appleProviderData.uid;
            } else if (appleProviderData.uid === redirectResult.user.uid) {
              try {
                const idTokenResult = await redirectResult.user.getIdTokenResult();
                const customClaims = idTokenResult.claims;
                console.log('🍎 Firebase ID Token Claims:', customClaims);
                if (customClaims.sub && customClaims.sub !== redirectResult.user.uid) {
                  appleUserId = customClaims.sub;
                }
              } catch {
                // Ignore errors when getting ID token claims
              }
            }
          }

          if (providerType === 'apple') {
            console.log('🍎 Apple Sign-In - Final User Identifiers:', {
              firebaseUid: redirectResult.user.uid,
              providerDataUid: appleProviderData?.uid,
              extractedAppleUserId: appleUserId,
              email: redirectResult.user.email,
              isAppleUserIdExtracted: appleUserId !== redirectResult.user.uid
            });
          }

          // Authenticate with backend (guard against duplicate call from onAuthStateChanged).
          // Only skip the backend call when ref is already true; never skip Steps 2/3 (listener setup).
          if (!backendAuthInProgressRef.current) {
            backendAuthInProgressRef.current = true;
            let backendResponse: Awaited<ReturnType<typeof authenticateWithBackend>>;
            try {
              if (providerType === 'apple' && !redirectResult.appleIdentityToken) {
                // Firebase token only — backend expects Apple JWT at /auth/apple/signin; use /auth/login instead.
                backendResponse = await loginWithFirebaseToken(accessToken);
              } else if (providerType === 'apple' && redirectResult.appleIdentityToken) {
                backendResponse = await authenticateWithBackend(
                  redirectResult.appleIdentityToken,
                  'apple',
                  { userIdentifier: appleUserId, email: redirectResult.user.email || undefined, fullName: redirectResult.user.displayName || undefined }
                );
              } else {
                backendResponse = await authenticateWithBackend(
                  accessToken,
                  providerType,
                  undefined
                );
              }
            } finally {
              backendAuthInProgressRef.current = false;
            }

            if (backendResponse?.success && backendResponse?.sessionToken) {
              storeSessionToken(backendResponse.sessionToken);
              setHasSessionToken(true);
              setSubscription(backendResponse.subscription || null);
              setTrial(backendResponse.trial ?? null);
              setAuthProvider(providerType);
              void fetchSubscriptionFromBackend(backendResponse.sessionToken);

              // Fetch linked providers (non-blocking)
              refreshLinkedProviders(backendResponse.sessionToken);

              // Check if this is from ASWebAuthenticationSession (macOS desktop app)
              if (isASWebSession()) {
                if (window.location.pathname !== '/account') {
                  console.log('🔐 ASWebAuthenticationSession (redirect) - redirecting to /account for manual deeplink');
                  window.location.href = '/account?asweb=1';
                }
                return;
              }

              // Normal web flow - always land on account after login.
              if (window.location.pathname !== '/account') {
                window.location.href = postLoginUrl();
              }
              return;
            } else if (backendResponse?.error?.includes('recently deleted')) {
              // Handle case where user account was deleted but Firebase auth is still active
              console.log('🚨 Account was recently deleted, clearing Firebase auth and redirecting to sign-in');

              // Clear Firebase auth
              const { signOut } = await import('@/auth');
              await signOut();

              // Clear session token
              clearSessionToken();
              setHasSessionToken(false);
              setAuthProvider(null);

              // Clear user state
              setUser(null);
              setSubscription(null);
              setTrial(null);

              toast({
                title: "Account Recently Deleted",
                description: backendResponse.error,
                variant: "destructive",
                duration: 10000,
              });

              // Redirect to sign-in page
              window.location.href = '/signin';
              return;
            } else if (backendResponse?.error) {
              // Clear Firebase auth so user can't access protected pages
              const { signOut: signOutAuth } = await import('@/auth');
              await signOutAuth();
              clearSessionToken();
              setHasSessionToken(false);
              setAuthProvider(null);
              setUser(null);
              setSubscription(null);
              setTrial(null);

              toast({
                title: "Sign-In Failed",
                description: backendResponse.error,
                variant: "destructive",
              });

              window.location.href = '/signin';
              return;
            }
          } else {
            setLoading(false);
          }
        }
      }

      // Step 2: Check for existing session token (prioritize this for faster redirect)
      const sessionToken = getSessionToken();
      // Keep hasSessionToken in sync even if a token was set outside this component.
      setHasSessionToken(Boolean(sessionToken));

      if (sessionToken) {
        // Verify existing session token before updating UI state
        try {
          const response = await verifySessionToken(sessionToken);

          if (response.success && response.user && mounted) {
            // Create a mock Firebase user for compatibility
            setUser({
              uid: response.user.id,
              email: response.user.email,
              displayName: response.user.name,
            } as FirebaseUser);

            // Prefer the sign-in provider already persisted (set during login)
            // over the DB registration provider, which may differ for linked accounts.
            if (!localStorage.getItem('auth_provider') && !sessionStorage.getItem('auth_provider')) {
              setAuthProvider(response.user.provider || null);
            }

            setSubscription(response.subscription || null);
            setTrial(response.trial ?? null);
            void fetchSubscriptionFromBackend(sessionToken);

            // Fetch linked providers (non-blocking, pass token directly to avoid timing issues)
            refreshLinkedProviders(sessionToken);

            // Check if this is from ASWebAuthenticationSession (macOS desktop app)
            if (isASWebSession() && window.location.pathname === '/signin') {
              console.log('🔐 ASWebSession detected - user already logged in on signin, redirecting to account');
              window.location.href = '/account?asweb=1';
              setLoading(false);
              return;
            }

            // Immediately redirect if on signin page
            if (window.location.pathname === '/signin') {
              window.location.href = postLoginUrl();
            }

            setLoading(false);
            return;
          }
          if (response.unauthorized) {
            // Backend explicitly rejected the token (401 or invalid) — clear session
            console.log('🚨 Invalid session token, clearing auth state');
            clearSessionToken();
            setHasSessionToken(false);
            setAuthProvider(null);

            // Also clear Firebase auth if user is still authenticated
            try {
              const { signOut } = await import('@/auth');
              await signOut();
              console.info('🚨 Cleared Firebase auth due to invalid session token');
            } catch {
              // Ignore errors when clearing persistence
            }
          }
          // On network error (success: false, unauthorized: false) we do not clear — keep session and let Firebase listener run
          setLoading(false);
        } catch (error) {
          console.warn('⚠️ Failed to verify session token, falling back to Firebase auth listener:', error);
          setLoading(false);
        }
      }

      // Step 3: Set up Firebase auth state listener
      const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
        if (!mounted) return;

        setUser(firebaseUser);

        if (firebaseUser && !isAuthenticating) {
          const sessionToken = getSessionToken();
          setHasSessionToken(Boolean(sessionToken));
          if (sessionToken) {
            await fetchSubscriptionFromBackend(sessionToken);
          } else if (!backendAuthInProgressRef.current) {
            // Firebase user exists but no backend session — get session via login (Firebase token).
            // Use /auth/login, not provider signin: we have a Firebase ID token here, and
            // /auth/apple/signin expects an Apple identity token, so sending Firebase token there is wrong.
            backendAuthInProgressRef.current = true;
            try {
              const idToken = await firebaseUser.getIdToken();
              const backendResponse = await loginWithFirebaseToken(idToken);

              if (backendResponse.success && backendResponse.sessionToken) {
                storeSessionToken(backendResponse.sessionToken);
                setHasSessionToken(true);
                setSubscription(backendResponse.subscription || null);
                setTrial(backendResponse.trial ?? null);
                void fetchSubscriptionFromBackend(backendResponse.sessionToken);
                // Never overwrite auth_provider here — this path runs from the
                // onAuthStateChanged listener which races with signIn(). The signIn
                // flow sets the correct provider; the backend's user.provider is the
                // *registration* provider which may differ for linked accounts.
                refreshLinkedProviders(backendResponse.sessionToken);

                if (window.location.pathname === '/signin') {
                  window.location.href = postLoginUrl();
                  return;
                }
              } else if (backendResponse.error) {
                // Backend rejected — clear Firebase auth so user can't access protected pages
                const { signOut } = await import('@/auth');
                await signOut();
                clearSessionToken();
                setHasSessionToken(false);
                setAuthProvider(null);
                setUser(null);
                setSubscription(null);
                setTrial(null);

                toast({
                  title: "Sign-In Failed",
                  description: backendResponse.error,
                  variant: "destructive",
                });
              }
            } catch (err) {
              console.error('Failed to sync Firebase user with backend:', err);
            } finally {
              backendAuthInProgressRef.current = false;
            }
          }
        } else if (!firebaseUser) {
          // Only clear subscription if there's no valid session token.
          // On page reload, Firebase may fire with null before loading the
          // persisted auth state, which would clear a subscription that
          // verifySessionToken already resolved.
          if (!getSessionToken()) {
            setSubscription(null);
            setTrial(null);
          }
          setAuthProvider(null);
          syncHasSessionToken();
        }

        setLoading(false);
      });

      setLoading(false);

      return () => {
        mounted = false;
        unsubscribe();
      };
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Sign In
  // ============================================================================

  const signIn = React.useCallback(async (provider: 'google' | 'apple' = 'google'): Promise<{ success: boolean; shouldRedirect?: string }> => {
    if (isAuthenticating) {
      return { success: false };
    }

    setIsAuthenticating(true);

    try {
      const providerName = provider === 'apple' ? 'Apple' : 'Google';

      toast({
        title: `Opening ${providerName} Sign-In...`,
        description: "Please complete the authentication.",
      });

      // Use centralized sign-in with automatic fallback
      const result: SignInResult = provider === 'apple'
        ? await signInWithApple()
        : await signInWithGoogle();

      // If redirect was used, the page will redirect away
      if (result.usedRedirect) {
        return { success: true };
      }

      // Handle errors
      if (!result.success || !result.user) {
        const error = result.error;
        if (error) {
          toast({
            title: "Sign-In Failed",
            description: error.userMessage,
            variant: "destructive",
          });
        }
        setIsAuthenticating(false);
        return { success: false };
      }

      // Claim backend auth so we don't duplicate the API call. Only set if not already
      // claimed by onAuthStateChanged (which can fire before signInWith* Promise resolves).
      const refAlreadyClaimed = backendAuthInProgressRef.current;
      if (!refAlreadyClaimed) {
        backendAuthInProgressRef.current = true;
      }

      // Set user immediately for UI update
      setUser(result.user);

      // Get access token for backend
      const accessToken = result.accessToken;
      if (!accessToken) {
        backendAuthInProgressRef.current = false;
        toast({
          title: "Authentication Error",
          description: "No access token received. Please try again.",
          variant: "destructive",
        });
        setIsAuthenticating(false);
        return { success: false };
      }

      // Use the sign-in provider parameter; do not infer from providerData[0] (wrong for linked accounts)
      const providerType = provider;
      const appleProviderData = providerType === 'apple' ? result.user.providerData?.find((p) => p?.providerId?.includes('apple')) : undefined;

      if (providerType === 'apple') {
        console.log('🍎 Apple Sign-In - Full Provider Data:', {
          allProviderData: result.user.providerData,
          appleProvider: appleProviderData,
          firebaseUid: result.user.uid,
          email: result.user.email
        });
      }

      // Extract Apple user ID from the Apple provider entry only
      let appleUserId = result.user.uid; // fallback
      if (providerType === 'apple' && appleProviderData) {
        if (appleProviderData.uid && appleProviderData.uid !== result.user.uid) {
          appleUserId = appleProviderData.uid;
        } else if (appleProviderData.uid === result.user.uid) {
          try {
            const idTokenResult = await result.user.getIdTokenResult();
            const customClaims = idTokenResult.claims;
            console.log('🍎 Firebase ID Token Claims:', customClaims);
            if (customClaims.sub && customClaims.sub !== result.user.uid) {
              appleUserId = customClaims.sub;
            }
          } catch (error) {
            console.warn('⚠️ Failed to get ID token claims:', error);
          }
        }
      }

      if (providerType === 'apple') {
        console.log('🍎 Apple Sign-In - Final User Identifiers:', {
          firebaseUid: result.user.uid,
          providerDataUid: appleProviderData?.uid,
          extractedAppleUserId: appleUserId,
          email: result.user.email,
          isAppleUserIdExtracted: appleUserId !== result.user.uid
        });
      }

      // We know which provider the user just authenticated with — persist it now
      // before any early-exit paths, so onAuthStateChanged can't overwrite it.
      setAuthProvider(provider);

      // If ref was already claimed by onAuthStateChanged, or it's now false (listener finished),
      // skip our backend call to avoid duplicate request.
      if (refAlreadyClaimed || !backendAuthInProgressRef.current) {
        if (refAlreadyClaimed) {
          // Listener owns the backend call; let it store token and redirect.
          setIsAuthenticating(false);
          return { success: true };
        }
        const token = getSessionToken();
        if (token) {
          const response = await verifySessionToken(token);
          if (!response.success) {
            if (response.unauthorized) {
              clearSessionToken();
              setHasSessionToken(false);
              setAuthProvider(null);
              setUser(null);
              setSubscription(null);
              setTrial(null);
              try {
                await firebaseSignOut();
              } catch {
                // Ignore sign-out errors while clearing invalid auth state.
              }
            }
            setIsAuthenticating(false);
            return { success: false };
          }
          setSubscription(response.subscription || null);
          setTrial(response.trial ?? null);
          void fetchSubscriptionFromBackend(token);
          if (window.location.pathname === '/signin') {
            window.location.href = postLoginUrl();
            setIsAuthenticating(false);
            return { success: true };
          }
          setIsAuthenticating(false);
          return { success: true };
        }
        // onAuthStateChanged ran but left no session token (backend auth failed)
        setIsAuthenticating(false);
        return { success: false };
      }

      let backendResponse: Awaited<ReturnType<typeof authenticateWithBackend>>;
      try {
        if (providerType === 'apple' && !result.appleIdentityToken) {
          // We only have Firebase ID token; /auth/apple/signin expects Apple JWT. Use /auth/login instead.
          backendResponse = await loginWithFirebaseToken(accessToken);
        } else if (providerType === 'apple' && result.appleIdentityToken) {
          backendResponse = await authenticateWithBackend(
            result.appleIdentityToken,
            'apple',
            { userIdentifier: appleUserId, email: result.user.email || undefined, fullName: result.user.displayName || undefined }
          );
        } else {
          backendResponse = await authenticateWithBackend(
            accessToken,
            providerType,
            undefined
          );
        }
      } catch (e) {
        // Only release the ref on unexpected errors (network, etc.)
        backendAuthInProgressRef.current = false;
        throw e;
      }
      // Keep backendAuthInProgressRef true during error handling below
      // to prevent onAuthStateChanged from starting a competing login flow.

      if (backendResponse.success && backendResponse.sessionToken) {
        backendAuthInProgressRef.current = false;
        storeSessionToken(backendResponse.sessionToken);
        setHasSessionToken(true);
        setSubscription(backendResponse.subscription || null);
        setTrial(backendResponse.trial ?? null);
        void fetchSubscriptionFromBackend(backendResponse.sessionToken);
        refreshLinkedProviders(backendResponse.sessionToken);

        setIsAuthenticating(false);

        dismissToast();
        toast({
          title: "Welcome back!",
          description: "Redirecting to your account...",
        });

        // After any successful login, always land on account.
        if (window.location.pathname !== '/account') {
          window.location.href = postLoginUrl();
        }

        return { success: true, shouldRedirect: undefined };
      } else if (backendResponse.error?.includes('recently deleted')) {
        // Handle case where user account was deleted but Firebase auth is still active
        console.info('🚨 Account was recently deleted during popup sign-in, clearing Firebase auth');

        // Clear Firebase auth — keep ref locked until signOut completes
        try {
          const { signOut: signOutAuth } = await import('@/auth');
          await signOutAuth();
        } catch { /* ignore */ }
        backendAuthInProgressRef.current = false;

        // Clear session token
        clearSessionToken();
        setHasSessionToken(false);
        setAuthProvider(null);

        // Clear user state
        setUser(null);
        setSubscription(null);
        setTrial(null);

        setIsAuthenticating(false);

        toast({
          title: "Account Recently Deleted",
          description: backendResponse.error,
          variant: "destructive",
          duration: 10000, // Show for 10 seconds so user can read the exact time
        });

        return { success: false };
      }

      if (backendResponse.error) {
        // Clear Firebase auth — keep ref locked until signOut completes
        try {
          const { signOut: signOutAuth } = await import('@/auth');
          await signOutAuth();
        } catch { /* ignore */ }
        backendAuthInProgressRef.current = false;
        clearSessionToken();
        setHasSessionToken(false);
        setAuthProvider(null);
        setUser(null);
        setSubscription(null);
        setTrial(null);

        toast({
          title: "Sign-In Failed",
          description: backendResponse.error,
          variant: "destructive",
        });

        setIsAuthenticating(false);
        return { success: false };
      }

      backendAuthInProgressRef.current = false;
      setIsAuthenticating(false);
      return { success: false };
    } catch (error: unknown) {
      backendAuthInProgressRef.current = false;
      const mappedError = mapFirebaseError(error);

      toast({
        title: "Sign-In Error",
        description: mappedError.userMessage,
        variant: "destructive",
      });

      setIsAuthenticating(false);
      return { success: false };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshLinkedProviders is stable but declared after signIn
  }, [isAuthenticating, toast, postLoginUrl]);

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = React.useCallback(async () => {
    try {
      await firebaseSignOut();
      clearSessionToken();
      setHasSessionToken(false);
      setUser(null);
      setSubscription(null);
      setTrial(null);
      setAuthProvider(null);

      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account',
      });
    } catch {
      toast({
        title: 'Sign out failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [toast, setAuthProvider]);

  // ============================================================================
  // Refresh Subscription
  // ============================================================================

  const refreshSubscription = React.useCallback(async () => {
    const sessionToken = getSessionToken();
    setHasSessionToken(Boolean(sessionToken));
    if (sessionToken) {
      await fetchSubscriptionFromBackend(sessionToken);
    }
  }, [fetchSubscriptionFromBackend]);

  // ============================================================================
  // Linked Providers
  // ============================================================================

  const refreshLinkedProviders = React.useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || getSessionToken();
    if (!token) return;
    try {
      const result = await getLinkedProviders(token);
      setLinkedProviders(result.providers);
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = React.useMemo<AuthContextType>(() => ({
    user,
    subscription,
    trial,
    loading,
    isAuthenticating,
    linkedProviders,
    hasSessionToken,
    authProvider,
    signIn,
    logout,
    refreshSubscription,
    refreshLinkedProviders,
  }), [user, subscription, trial, loading, isAuthenticating, hasSessionToken, linkedProviders, authProvider, signIn, logout, refreshSubscription, refreshLinkedProviders]);

  return (
    <AuthContext.Provider value={value}>
      {children}

    </AuthContext.Provider>
  );
};

// ============================================================================
// Hook (exported from same file as provider for ergonomics; refresh warning acceptable)
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components -- useAuth is the standard hook for AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

