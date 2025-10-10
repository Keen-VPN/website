import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Apple } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import GoogleIcon from '@/components/ui/google-icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    // Simple effect to test hooks
    console.log('SignIn component mounted');
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn();
      if (result.success && result.shouldRedirect) {
        navigate(result.shouldRedirect);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    // For now, redirect to Google sign-in
    // In a real implementation, you'd integrate Apple Sign-In
    handleGoogleSignIn();
  };

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
            <p className="text-xl text-muted-foreground mb-2">
              Sign in or create your account
            </p>
            <p className="text-sm text-muted-foreground">
              New users will be automatically registered
            </p>
          </div>

          <Card className="border-primary/50 shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign In / Sign Up</CardTitle>
              <CardDescription>
                One click to sign in or create your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white text-gray-900 hover:bg-gray-50 border border-gray-300"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Sign In / Sign Up with Google
                  </>
                )}
              </Button>

              <Button
                onClick={handleAppleSignIn}
                disabled={loading}
                className="w-full bg-black text-white hover:bg-gray-800"
                size="lg"
              >
                <Apple className="mr-2 h-5 w-5" />
                Sign In / Sign Up with Apple
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

          <div className="text-center mt-8 space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              🔐 One-Click Authentication
            </p>
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
