import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  status: string;
  endDate: string;
  customerId: string;
  plan?: string;
  cancelAtPeriodEnd?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  subscription: SubscriptionData | null;
  loading: boolean;
  signIn: () => Promise<{ success: boolean; shouldRedirect?: string }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://vpnkeen.netlify.app/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptionStatusByToken = async (sessionToken: string) => {
    try {
      // Use the verify endpoint which returns user + subscription data
      const response = await fetch(`${BACKEND_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken
        }),
      });

      const data = await response.json();

      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription by token:', error);
      setSubscription(null);
    }
  };

  useEffect(() => {
    // Check for existing session token first
    const checkSession = async () => {
      const sessionToken = localStorage.getItem('sessionToken');
      
      if (sessionToken) {
        console.log('🔍 Found existing session token, verifying...');
        try {
          // Verify session token with backend
          const response = await fetch(`${BACKEND_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionToken }),
          });

          const data = await response.json();
          
          if (data.success && data.user) {
            console.log('✅ Session token valid, user authenticated');
            // Create a mock Firebase user object for compatibility
            setUser({
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.name,
            } as any);
            
            // Fetch subscription status
            await fetchSubscriptionStatusByToken(sessionToken);
            setLoading(false);
            return;
          } else {
            console.log('❌ Session token invalid, clearing...');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('token');
            localStorage.removeItem('google_access_token');
          }
        } catch (error) {
          console.error('Error verifying session token:', error);
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('token');
          localStorage.removeItem('google_access_token');
        }
      }
      
      // Fall back to Firebase auth state
      setLoading(false);
    };

    // Check for redirect result FIRST (before checking session)
    const checkRedirectResult = async () => {
      try {
        console.log('🔍 Checking for redirect result...');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 URL params:', window.location.search);
        
        const result = await getRedirectResult(auth);
        console.log('🔍 getRedirectResult returned:', result);
        
        if (result) {
          console.log('✅ Redirect result found!', result);
          console.log('✅ User:', result.user?.email);
          
          const credential = GoogleAuthProvider.credentialFromResult(result);
          console.log('✅ Credential:', credential);
          
          const accessToken = credential?.accessToken;
          
          if (!accessToken) {
            console.error('❌ No access token from redirect result');
            console.error('❌ Credential object:', credential);
            return;
          }
          
          console.log('✅ Access token obtained:', accessToken.substring(0, 20) + '...');
          localStorage.setItem('google_access_token', accessToken);
          
          // Handle post-redirect routing
          try {
            console.log('🔵 Sending Google access token to backend after redirect...');
            const response = await fetch(`${BACKEND_URL}/auth/google/signin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                idToken: accessToken  // Backend expects this as 'idToken' but uses it as access_token
              }),
            });

            const data = await response.json();
            console.log('✅ Backend response:', data);
            
            if (data.success) {
              // Store session token
              if (data.sessionToken) {
                console.log('💾 Storing session token');
                localStorage.setItem('sessionToken', data.sessionToken);
                localStorage.setItem("token", `keenvpn://auth?token=${data.sessionToken}`);
              }
              
              setSubscription(data.subscription);
              
              if (data.subscription && data.subscription.status === 'active') {
                // Active user - redirect to account management
                console.log('🔄 Redirecting to /account');
                window.location.href = "/account";
              } else {
                // User exists but no active subscription - redirect to subscribe
                console.log('🔄 Redirecting to /subscribe');
                window.location.href = "/subscribe";
              }
            } else {
              // New user - redirect to subscribe
              console.log('🔄 Redirecting to /subscribe (new user)');
              window.location.href = "/subscribe";
            }
          } catch (error) {
            console.error("❌ Error checking subscription after redirect:", error);
            // Fallback - redirect to subscribe page
            console.log('🔄 Redirecting to /subscribe (error fallback)');
            window.location.href = "/subscribe";
          }
        } else {
          console.log('ℹ️ No redirect result found');
          console.log('ℹ️ Checking if user is authenticated via Firebase...');
          
          // Check if user is authenticated but we didn't get redirect result
          // This can happen if the page reloaded or redirect was already processed
          const currentUser = auth.currentUser;
          if (currentUser) {
            console.log('✅ User is authenticated via Firebase:', currentUser.email);
            console.log('🔵 Getting Firebase ID token to send to backend...');
            
            try {
              const idToken = await currentUser.getIdToken();
              console.log('✅ Got Firebase ID token');
              
              // Send Firebase ID token to backend
              const response = await fetch(`${BACKEND_URL}/auth/google/signin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  idToken
                }),
              });

              const data = await response.json();
              console.log('✅ Backend response:', data);
              
              if (data.success && data.sessionToken) {
                console.log('💾 Storing session token');
                localStorage.setItem('sessionToken', data.sessionToken);
                localStorage.setItem("token", `keenvpn://auth?token=${data.sessionToken}`);
                setSubscription(data.subscription);
                
                // Only redirect if we're on the signin page
                if (window.location.pathname === '/signin') {
                  if (data.subscription && data.subscription.status === 'active') {
                    console.log('🔄 Redirecting to /account');
                    window.location.href = "/account";
                  } else {
                    console.log('🔄 Redirecting to /subscribe');
                    window.location.href = "/subscribe";
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error processing authenticated user:', error);
            }
          } else {
            console.log('ℹ️ No authenticated user found (normal page load)');
          }
        }
      } catch (error) {
        console.error('❌ Error checking redirect result:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
      }
    };

    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Only update if we don't already have a valid session
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Fetch subscription status
          await fetchSubscriptionStatus(firebaseUser);
        } else {
          setSubscription(null);
        }
        
        setLoading(false);
      }
    });

    // Execute in order: redirect result first, then session check
    const initAuth = async () => {
      await checkRedirectResult();
      await checkSession();
    };

    initAuth();

    return () => unsubscribe();
  }, []);

  const fetchSubscriptionStatus = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch(`${BACKEND_URL}/auth/google/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken
        }),
      });

      const data = await response.json();

      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    }
  };

  const signIn = async (): Promise<{ success: boolean; shouldRedirect?: string }> => {
    try {
      toast({
        title: "Opening Google Sign-In...",
        description: "Please complete the authentication in the popup window.",
      });

      console.log('🔵 Initiating Google Sign-In with popup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Full sign-in result:", result);

      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential) {
        console.warn("⚠️ No credential returned");
        toast({
          title: "⚠️ No credential returned",
          description: "Sign-in may still be successful.",
          variant: "destructive",
        });
        return { success: false };
      }

      const accessToken = credential.accessToken;
      console.log("✅ AccessToken:", accessToken?.substring(0, 20) + '...');
      
      if (!accessToken) {
        console.error("❌ No access token");
        return { success: false };
      }

      // Send access token to backend
      console.log('🔵 Sending access token to backend...');
      const response = await fetch(`${BACKEND_URL}/auth/google/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: accessToken  // Backend expects 'idToken' but will verify as access token
        }),
      });

      const data = await response.json();
      console.log('✅ Backend response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Backend authentication failed');
      }

      if (data.success && data.sessionToken) {
        // Store session token
        console.log('💾 Storing session token');
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem("token", `keenvpn://auth?token=${data.sessionToken}`);
        
        setSubscription(data.subscription);

        toast({
          title: "✅ Login Successful",
          description: "Redirecting...",
        });

        if (data.subscription && data.subscription.status === 'active') {
          return { success: true, shouldRedirect: "/account" };
        } else {
          return { success: true, shouldRedirect: "/subscribe" };
        }
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error("❌ Sign-in error:", error);
      console.error("❌ Error code:", error?.code);
      
      toast({
        title: "Login Failed",
        description: error?.message || "An error occurred during sign-in",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('google_access_token');
      setSubscription(null);
      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const refreshSubscription = async () => {
    if (user) {
      await fetchSubscriptionStatus(user);
    }
  };

  const value = {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
