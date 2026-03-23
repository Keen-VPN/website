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
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
  type SubscriptionData,
  type SignInResult
} from '@/auth';

// ============================================================================
// Context Types
// ============================================================================

interface AuthContextType {
  user: FirebaseUser | null;
  backendProvider: string | null;
  subscription: SubscriptionData | null;
  loading: boolean;
  isAuthenticating: boolean;
  signIn: (provider?: 'google' | 'apple') => Promise<{ success: boolean; shouldRedirect?: string }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [backendProvider, setBackendProvider] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  /** Guards against duplicate authenticateWithBackend calls (signIn + onAuthStateChanged or double-click). */
  const backendAuthInProgressRef = useRef(false);
  /** Avoid repeated /auth/login calls when backend provider is missing/invalid. */
  const providerSyncAttemptedForUidRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Check if user came from ASWebAuthenticationSession (macOS desktop app)
  const isASWebSession = () => {
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
  };

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const fetchSubscriptionFromBackend = async (sessionToken: string) => {
    try {
      const response = await verifySessionToken(sessionToken);

      if (response.success && response.subscription) {
        setSubscription(response.subscription);
        setBackendProvider(response.user?.provider ?? null);
        return response.user?.provider ?? null;
      } else {
        setSubscription(null);
        setBackendProvider(response.user?.provider ?? null);
        return response.user?.provider ?? null;
      }
    } catch {
      setSubscription(null);
      setBackendProvider(null);
      return null;
    }
  };

  const inferProviderFromFirebase = (firebaseUser: FirebaseUser): 'google' | 'apple' => {
    return firebaseUser.providerData?.some((p) => p?.providerId?.toLowerCase().includes('apple'))
      ? 'apple'
      : 'google';
  };

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
                backendResponse = await loginWithFirebaseToken(accessToken, providerType);
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
              setSubscription(backendResponse.subscription || null);
              setBackendProvider(backendResponse.user?.provider ?? null);

              const currentPath = window.location.pathname;

              // Only auto-redirect after auth redirect flow when the user is on /signin.
              // On hard refresh of protected pages (e.g. /account/subscription-history),
              // keep the user on the same route.
              if (currentPath === '/signin') {
                // Check if this is from ASWebAuthenticationSession (macOS desktop app)
                if (isASWebSession()) {
                  console.log('🔐 ASWebAuthenticationSession (redirect) - redirecting to /account for manual deeplink');
                  window.location.href = '/account?asweb=1';
                  return;
                }

                // Normal web flow - redirect based on subscription status
                const hasActiveSubscription =
                  backendResponse.subscription &&
                  backendResponse.subscription.status === 'active';

                if (hasActiveSubscription) {
                  window.location.href = '/account';
                } else {
                  window.location.href = '/subscribe';
                }
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

              // Clear user state
              setUser(null);
              setSubscription(null);
              setBackendProvider(null);

              // Show user-friendly message with exact time
              alert(backendResponse.error);

              // Redirect to sign-in page
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

            setBackendProvider(response.user.provider ?? null);

            if (response.subscription) {
              setSubscription(response.subscription);
            }

            // Check if this is from ASWebAuthenticationSession (macOS desktop app)
            if (isASWebSession() && window.location.pathname === '/signin') {
              console.log('🔐 ASWebSession detected - user already logged in on signin, redirecting to account');
              window.location.href = '/account?asweb=1';
              setLoading(false);
              return;
            }

            // Immediately redirect if on signin page (normal web flow)
            if (window.location.pathname === '/signin') {
              const hasActiveSubscription = response.subscription && response.subscription.status === 'active';
              if (hasActiveSubscription) {
                window.location.href = '/account';
              } else {
                window.location.href = '/subscribe';
              }
            }

            setLoading(false);
            return;
          }
          if (response.unauthorized) {
            // Backend explicitly rejected the token (401 or invalid) — clear session
            console.log('🚨 Invalid session token, clearing auth state');
            clearSessionToken();
            setBackendProvider(null);

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
          if (sessionToken) {
            const providerFromTable = await fetchSubscriptionFromBackend(sessionToken);

            // If the backend user table has an invalid/missing provider (e.g. '-'),
            // re-sync it from the Firebase auth provider so Account displays correctly.
            if (
              (providerFromTable === null || providerFromTable === '-' || providerFromTable === 'unknown') &&
              providerSyncAttemptedForUidRef.current !== firebaseUser.uid
            ) {
              providerSyncAttemptedForUidRef.current = firebaseUser.uid;
              try {
                const idToken = await firebaseUser.getIdToken();
                const inferredProvider = inferProviderFromFirebase(firebaseUser);
                const backendResponse = await loginWithFirebaseToken(idToken, inferredProvider);
                if (backendResponse.success && backendResponse.sessionToken) {
                  storeSessionToken(backendResponse.sessionToken);
                  setSubscription(backendResponse.subscription || null);
                  setBackendProvider(backendResponse.user?.provider ?? inferredProvider);
                }
              } catch {
                // Best-effort: leave the UI showing whatever backend returned.
              }
            }
          } else if (!backendAuthInProgressRef.current) {
            // Firebase user exists but no backend session — get session via login (Firebase token).
            // Use /auth/login, not provider signin: we have a Firebase ID token here, and
            // /auth/apple/signin expects an Apple identity token, so sending Firebase token there is wrong.
            backendAuthInProgressRef.current = true;
            try {
              const idToken = await firebaseUser.getIdToken();
              const inferredProvider: 'google' | 'apple' =
                firebaseUser.providerData?.some((p) =>
                  p?.providerId?.toLowerCase().includes('apple'),
                )
                  ? 'apple'
                  : 'google';
              const backendResponse = await loginWithFirebaseToken(
                idToken,
                inferredProvider,
              );

              if (backendResponse.success && backendResponse.sessionToken) {
                storeSessionToken(backendResponse.sessionToken);
                setSubscription(backendResponse.subscription || null);
                setBackendProvider(backendResponse.user?.provider ?? null);

                if (window.location.pathname === '/signin') {
                  if (isASWebSession()) {
                    window.location.href = '/account?asweb=1';
                  } else {
                    const hasActive = backendResponse.subscription?.status === 'active';
                    window.location.href = hasActive ? '/account' : '/subscribe';
                  }
                  return;
                }
              }
            } catch (err) {
              console.error('Failed to sync Firebase user with backend:', err);
            } finally {
              backendAuthInProgressRef.current = false;
            }
          }
        } else if (!firebaseUser) {
          setSubscription(null);
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

      // Show immediate feedback
      toast({
        title: "✅ Authenticated",
        description: "Checking subscription status...",
      });

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
              setSubscription(null);
            }
            setIsAuthenticating(false);
            return { success: false };
          }
          if (response.subscription) setSubscription(response.subscription);
          if (window.location.pathname === '/signin') {
            const hasActive = response.subscription?.status === 'active';
            window.location.href = hasActive ? '/account' : '/subscribe';
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
            backendResponse = await loginWithFirebaseToken(accessToken, 'apple');
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
      } finally {
        backendAuthInProgressRef.current = false;
      }

      if (backendResponse.success && backendResponse.sessionToken) {
        storeSessionToken(backendResponse.sessionToken);
        setSubscription(backendResponse.subscription || null);
        setBackendProvider(backendResponse.user?.provider ?? null);

        setIsAuthenticating(false);

        // Check if this is from ASWebAuthenticationSession (macOS desktop app)
        if (isASWebSession()) {
          if (window.location.pathname !== '/account') {
            console.info('🔐 ASWebAuthenticationSession - redirecting to /account for manual deeplink');
            window.location.href = '/account?asweb=1';
          }
          return { success: true, shouldRedirect: undefined };
        } else {
          // Normal web/mobile user - redirect based on subscription status
          const hasActiveSubscription = backendResponse.subscription && backendResponse.subscription.status === 'active';

          if (hasActiveSubscription) {
            // User has active subscription - redirect to account page
            if (window.location.pathname !== '/account') {
              window.location.href = '/account';
            }
          } else {
            // User doesn't have active subscription - redirect to subscribe
            if (window.location.pathname !== '/subscribe') {
              window.location.href = '/subscribe';
            }
          }
        }

        return { success: true, shouldRedirect: undefined };
      } else if (backendResponse.error?.includes('recently deleted')) {
        // Handle case where user account was deleted but Firebase auth is still active
        console.info('🚨 Account was recently deleted during popup sign-in, clearing Firebase auth');

        // Clear Firebase auth
        import('@/auth').then(({ signOut }) => signOut()).catch(console.error);

        // Clear session token
        clearSessionToken();

        // Clear user state
        setUser(null);
        setSubscription(null);
        setBackendProvider(null);

        setIsAuthenticating(false);

        toast({
          title: "Account Recently Deleted",
          description: backendResponse.error,
          variant: "destructive",
          duration: 10000, // Show for 10 seconds so user can read the exact time
        });

        return { success: false };
      }

      setIsAuthenticating(false);
      return { success: false };
    } catch (error: unknown) {
      const mappedError = mapFirebaseError(error);

      toast({
        title: "Sign-In Error",
        description: mappedError.userMessage,
        variant: "destructive",
      });

      setIsAuthenticating(false);
      return { success: false };
    }
  }, [isAuthenticating, toast]);

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = React.useCallback(async () => {
    try {
      await firebaseSignOut();
      clearSessionToken();
      setUser(null);
      setSubscription(null);
      setBackendProvider(null);

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
  }, [toast]);

  // ============================================================================
  // Refresh Subscription
  // ============================================================================

  const refreshSubscription = React.useCallback(async () => {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      await fetchSubscriptionFromBackend(sessionToken);
    }
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = React.useMemo<AuthContextType>(() => ({
    user,
    backendProvider,
    subscription,
    loading,
    isAuthenticating,
    signIn,
    logout,
    refreshSubscription,
  }), [user, backendProvider, subscription, loading, isAuthenticating, signIn, logout, refreshSubscription]);

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

