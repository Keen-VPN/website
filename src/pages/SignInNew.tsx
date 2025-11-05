import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Apple } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextNew';
import { useDebounce } from '@/auth';
import GoogleIcon from '@/components/ui/google-icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SignIn = () => {
  const navigate = useNavigate();
  const { signIn, loading: authLoading, user, subscription } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Immediately redirect if user is already logged in
  // BUT: Don't redirect if this is from ASWebAuthenticationSession (macOS app)
  // The deeplink modal needs to show first
  React.useEffect(() => {
    if (!authLoading && user) {
      // Check if this is from ASWebAuthenticationSession (macOS desktop app)
      const urlParams = new URLSearchParams(window.location.search);
      const isASWebSession = urlParams.get('asweb') === '1' || sessionStorage.getItem('asweb_session') === '1';
      
      // Don't redirect if we're in an ASWebSession - let the deeplink modal show
      if (isASWebSession) {
        console.log('🔐 ASWebSession detected - skipping auto-redirect to allow deeplink modal');
        return;
      }
      
      // User is already logged in - redirect immediately
      // Use window.location for instant redirect (faster than navigate)
      const currentPath = window.location.pathname;
      if (currentPath === '/signin') {
        const hasActiveSubscription = subscription && subscription.status === 'active';
        if (hasActiveSubscription) {
          window.location.href = '/account';
        } else {
          window.location.href = '/subscribe';
        }
      }
    }
  }, [user, authLoading, subscription]);

  // Debounce sign-in to prevent double-clicks
  const [handleGoogleSignIn, isGoogleDebouncing] = useDebounce(async () => {
    setIsProcessing(true);
    const result = await signIn('google');
    // Don't navigate here - AuthContext will handle redirect based on subscription status
    if (!result.success) {
      setIsProcessing(false);
    }
    // Keep processing state true to prevent UI flicker during redirect
  }, 2000);

  const [handleAppleSignIn, isAppleDebouncing] = useDebounce(async () => {
    setIsProcessing(true);
    const result = await signIn('apple');
    // Don't navigate here - AuthContext will handle redirect based on subscription status
    if (!result.success) {
      setIsProcessing(false);
    }
    // Keep processing state true to prevent UI flicker during redirect
  }, 2000);

  const isLoading = authLoading || isGoogleDebouncing || isAppleDebouncing || isProcessing;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to KeenVPN
            </h1>
            <p className="text-xl text-muted-foreground">
              Get started with secure VPN access
            </p>
          </div>

          <Card className="border-primary/50 shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Continue with</CardTitle>
              <CardDescription>
                Choose your preferred sign-in method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 hover:bg-gray-50 border border-gray-300"
                size="lg"
              >
                {isGoogleDebouncing || (isLoading && !isAppleDebouncing) ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isGoogleDebouncing ? 'Please wait...' : 'Authenticating...'}
                  </>
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Continue with Google
                  </>
                )}
              </Button>

              <Button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="w-full bg-black text-white hover:bg-gray-800"
                size="lg"
              >
                {isAppleDebouncing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isAppleDebouncing ? 'Please wait...' : 'Authenticating...'}
                  </>
                ) : (
                  <>
                    <Apple className="mr-2 h-5 w-5" />
                    Continue with Apple
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  By signing in, you agree to our{' '}
                  <a href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Existing users will be signed in automatically.<br />
              New users will have an account created instantly.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignIn;

