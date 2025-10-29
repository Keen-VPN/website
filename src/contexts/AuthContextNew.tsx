import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithGoogle,
  signInWithApple,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getCurrentUser,
  mapFirebaseError,
  authenticateWithBackend,
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
  subscription: SubscriptionData | null;
  loading: boolean;
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
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const fetchSubscriptionFromBackend = async (sessionToken: string) => {
    try {
      const response = await verifySessionToken(sessionToken);
      
      if (response.success && response.subscription) {
        setSubscription(response.subscription);
        return response.subscription;
      } else {
        setSubscription(null);
        return null;
      }
    } catch (error) {
      setSubscription(null);
      return null;
    }
  };

  // ============================================================================
  // Initialize Auth State
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // Step 1: Check for redirect result FIRST
      const { checkRedirectResult } = await import('@/auth');
      const redirectResult = await checkRedirectResult();
      
      if (redirectResult && redirectResult.success && redirectResult.user) {
        // Set user immediately so UI updates
        setUser(redirectResult.user);
        setLoading(false);
        
        const accessToken = redirectResult.accessToken;
        if (accessToken) {
          // Determine provider from user's provider data
          const providerData = redirectResult.user.providerData?.[0];
          const providerId = providerData?.providerId || '';
          const providerType = providerId.includes('apple') ? 'apple' : 'google';
          
          // For Apple, extract the actual Apple user identifier from providerData
          // Debug: Log all providerData to understand the structure
          if (providerType === 'apple') {
            console.log('🍎 Apple Sign-In - Full Provider Data:', {
              allProviderData: redirectResult.user.providerData,
              firstProvider: redirectResult.user.providerData?.[0],
              firebaseUid: redirectResult.user.uid,
              email: redirectResult.user.email
            });
          }
          
          // Extract Apple user ID - try multiple approaches
          let appleUserId = redirectResult.user.uid; // fallback
          if (providerType === 'apple') {
            if (providerData?.uid && providerData.uid !== redirectResult.user.uid) {
              // providerData.uid is different from Firebase UID - this is likely the Apple user ID
              appleUserId = providerData.uid;
            } else if (providerData?.uid === redirectResult.user.uid) {
              // providerData.uid is same as Firebase UID - this might not be the real Apple user ID
              // Try to get it from the Firebase ID token instead
              try {
                const idTokenResult = await redirectResult.user.getIdTokenResult();
                const customClaims = idTokenResult.claims;
                console.log('🍎 Firebase ID Token Claims:', customClaims);
                
                // Apple user ID might be in custom claims or we need to decode the token
                if (customClaims.sub && customClaims.sub !== redirectResult.user.uid) {
                  appleUserId = customClaims.sub;
                }
              } catch (error) {
                console.warn('⚠️ Failed to get ID token claims:', error);
              }
            }
          }
          
          // Log for debugging cross-platform matching
          if (providerType === 'apple') {
            console.log('🍎 Apple Sign-In - Final User Identifiers:', {
              firebaseUid: redirectResult.user.uid,
              providerDataUid: providerData?.uid,
              extractedAppleUserId: appleUserId,
              email: redirectResult.user.email,
              providerId: providerId,
              isAppleUserIdExtracted: appleUserId !== redirectResult.user.uid
            });
          }
          
          // Authenticate with backend
          const backendResponse = await authenticateWithBackend(
            accessToken,
            providerType,
            providerType === 'apple' ? {
              userIdentifier: appleUserId,
              email: redirectResult.user.email || undefined,
              fullName: redirectResult.user.displayName || undefined
            } : undefined
          );
          
          if (backendResponse.success && backendResponse.sessionToken) {
            storeSessionToken(backendResponse.sessionToken);
            setSubscription(backendResponse.subscription || null);
            
            // Check if user has active subscription
            const hasActiveSubscription = backendResponse.subscription && backendResponse.subscription.status === 'active';
            
            // Detect if user is on desktop (macOS or Windows)
            const isDesktop = /Mac|Windows|Linux/.test(navigator.userAgent) && !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
            
            if (hasActiveSubscription) {
              // User has active subscription
              if (isDesktop) {
                // Desktop user with subscription - only trigger deep link from specific pages
                const shouldTriggerDeepLink = window.location.pathname === '/success' || 
                                           window.location.pathname === '/subscribe' ||
                                           window.location.search.includes('openapp=true');
                
                if (shouldTriggerDeepLink) {
                  console.log('🖥️ Desktop user with active subscription - triggering deep link from', window.location.pathname);
                  const sessionToken = backendResponse.sessionToken;
                  window.location.href = `vpnkeen://auth?token=${sessionToken}`;
                  
                  // Show message to user
                  setTimeout(() => {
                    if (window.location.pathname !== '/account') {
                      // If deep link didn't work, redirect to account page
                      window.location.href = '/account';
                    }
                  }, 2000);
                } else {
                  // Just redirect to account page without triggering deep link
                  if (window.location.pathname !== '/account') {
                    window.location.href = '/account';
                  }
                }
              } else {
                // Web/mobile user with subscription - redirect to account page
                if (window.location.pathname !== '/account') {
                  window.location.href = '/account';
                }
              }
            } else {
              // User doesn't have active subscription - redirect to account page
              if (window.location.pathname !== '/account') {
                window.location.href = '/account';
              }
            }
            return;
          } else if (backendResponse.error?.includes('recently deleted')) {
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
            
            // Show user-friendly message with exact time
            alert(backendResponse.error);
            
            // Redirect to sign-in page
            window.location.href = '/signin';
            return;
          }
        }
      }
      
      // Step 2: Check for existing session token
      const sessionToken = getSessionToken();
      
      if (sessionToken) {
        const response = await verifySessionToken(sessionToken);
        
        if (response.success && response.user && mounted) {
          // Create a mock Firebase user for compatibility
          setUser({
            uid: response.user.id,
            email: response.user.email,
            displayName: response.user.name,
          } as FirebaseUser);
          
          if (response.subscription) {
            setSubscription(response.subscription);
          }
          
          setLoading(false);
          return;
        } else {
          // Session token is invalid - clear it
          console.log('🚨 Invalid session token, clearing auth state');
          clearSessionToken();
          
          // Also clear Firebase auth if user is still authenticated
          // This handles the case where user was deleted from desktop but still has Firebase auth
          try {
            const { signOut } = await import('@/auth');
            await signOut();
            console.log('🚨 Cleared Firebase auth due to invalid session token');
          } catch (error) {
            console.warn('⚠️ Failed to clear Firebase auth:', error);
          }
        }
      }

      // Step 3: Set up Firebase auth state listener
      const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
        if (!mounted) return;
        
        setUser(firebaseUser);
        
        if (firebaseUser && !isAuthenticating) {
          // User is authenticated, fetch subscription
          const sessionToken = getSessionToken();
          if (sessionToken) {
            await fetchSubscriptionFromBackend(sessionToken);
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
  }, []);

  // ============================================================================
  // Sign In
  // ============================================================================

  const signIn = async (provider: 'google' | 'apple' = 'google'): Promise<{ success: boolean; shouldRedirect?: string }> => {
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

      // Set user immediately for UI update
      setUser(result.user);
      
      // Get access token for backend
      const accessToken = result.accessToken;
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "No access token received. Please try again.",
          variant: "destructive",
        });
        setIsAuthenticating(false);
        return { success: false };
      }

      // Determine provider type - use parameter first, then detect from user data
      const providerData = result.user.providerData?.[0];
      const providerId = providerData?.providerId || '';
      const detectedProvider = providerId.includes('apple') ? 'apple' : 'google';
      
      // Use the provider parameter if it matches, otherwise use detected
      const providerType = provider === detectedProvider ? provider : detectedProvider;

      // For Apple, extract the actual Apple user identifier from providerData
      // Debug: Log all providerData to understand the structure
      if (providerType === 'apple') {
        console.log('🍎 Apple Sign-In - Full Provider Data:', {
          allProviderData: result.user.providerData,
          firstProvider: result.user.providerData?.[0],
          firebaseUid: result.user.uid,
          email: result.user.email
        });
      }
      
      // Extract Apple user ID - try multiple approaches
      let appleUserId = result.user.uid; // fallback
      if (providerType === 'apple') {
        if (providerData?.uid && providerData.uid !== result.user.uid) {
          // providerData.uid is different from Firebase UID - this is likely the Apple user ID
          appleUserId = providerData.uid;
        } else if (providerData?.uid === result.user.uid) {
          // providerData.uid is same as Firebase UID - this might not be the real Apple user ID
          // Try to get it from the Firebase ID token instead
          try {
            const idTokenResult = await result.user.getIdTokenResult();
            const customClaims = idTokenResult.claims;
            console.log('🍎 Firebase ID Token Claims:', customClaims);
            
            // Apple user ID might be in custom claims or we need to decode the token
            if (customClaims.sub && customClaims.sub !== result.user.uid) {
              appleUserId = customClaims.sub;
            }
          } catch (error) {
            console.warn('⚠️ Failed to get ID token claims:', error);
          }
        }
      }

      // Log for debugging cross-platform matching
      if (providerType === 'apple') {
        console.log('🍎 Apple Sign-In - Final User Identifiers:', {
          firebaseUid: result.user.uid,
          providerDataUid: providerData?.uid,
          extractedAppleUserId: appleUserId,
          email: result.user.email,
          providerId: providerId,
          isAppleUserIdExtracted: appleUserId !== result.user.uid
        });
      }

      // Show immediate feedback
      toast({
        title: "✅ Authenticated",
        description: "Checking subscription status...",
      });

      // Authenticate with backend (WAIT for response to check subscription)
      const backendResponse = await authenticateWithBackend(
        accessToken,
        providerType,
        providerType === 'apple' ? {
          userIdentifier: appleUserId,
          email: result.user.email || undefined,
          fullName: result.user.displayName || undefined
        } : undefined
      );
      
      if (backendResponse.success && backendResponse.sessionToken) {
        storeSessionToken(backendResponse.sessionToken);
        setSubscription(backendResponse.subscription || null);
        
        // Check if user has active subscription
        const hasActiveSubscription = backendResponse.subscription && backendResponse.subscription.status === 'active';
        
        // Detect if user is on desktop (macOS or Windows)
        const isDesktop = /Mac|Windows|Linux/.test(navigator.userAgent) && !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
        
        setIsAuthenticating(false);
        
        if (isDesktop) {
          // Desktop user - trigger deep link to open app regardless of subscription status
          console.log('🖥️ Desktop user - triggering deep link to open app');
          const sessionToken = backendResponse.sessionToken;
          window.location.href = `vpnkeen://auth?token=${sessionToken}`;
          
          // Show message to user
          setTimeout(() => {
            if (window.location.pathname !== '/account') {
              // If deep link didn't work, redirect to account page
              window.location.href = '/account';
            }
          }, 2000);
        } else {
          // Web/mobile user - redirect to account page
          if (window.location.pathname !== '/account') {
            window.location.href = '/account';
          }
        }
        
        return { success: true, shouldRedirect: null };
      } else if (backendResponse.error?.includes('recently deleted')) {
        // Handle case where user account was deleted but Firebase auth is still active
        console.log('🚨 Account was recently deleted during popup sign-in, clearing Firebase auth');
        
        // Clear Firebase auth
        import('@/auth').then(({ signOut }) => signOut()).catch(console.error);
        
        // Clear session token
        clearSessionToken();
        
        // Clear user state
        setUser(null);
        setSubscription(null);
        
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
    } catch (error: any) {
      const mappedError = mapFirebaseError(error);
      
      toast({
        title: "Sign-In Error",
        description: mappedError.userMessage,
        variant: "destructive",
      });
      
      setIsAuthenticating(false);
      return { success: false };
    }
  };

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = async () => {
    try {
      await firebaseSignOut();
      clearSessionToken();
      setUser(null);
      setSubscription(null);
      
      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account',
      });
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // Refresh Subscription
  // ============================================================================

  const refreshSubscription = async () => {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      await fetchSubscriptionFromBackend(sessionToken);
    }
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    user,
    subscription,
    loading,
    signIn,
    logout,
    refreshSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

