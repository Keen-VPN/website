import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextNew';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://vpnkeen.netlify.app/api';

const Subscribe = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, subscription } = useAuth();

  const handleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.shouldRedirect) {
      navigate(result.shouldRedirect);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to subscribe',
        variant: 'destructive',
      });
      return;
    }

    // Check if user already has active subscription
    if (subscription && subscription.status === 'active') {
      toast({
        title: 'Already subscribed',
        description: 'You already have an active subscription',
      });
      navigate('/account');
      return;
    }

    try {
      setCheckoutLoading(true);

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Create checkout session
      const response = await fetch(`${BACKEND_URL}/subscription/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      setCheckoutLoading(false);
    }
  };

  const plan = {
    name: 'KeenVPN Premium',
    price: '$100',
    period: '/year',
    description: 'Complete VPN protection for the entire year',
    features: [
      'Unlimited bandwidth with no throttling',
      'Multi-device support (up to 10 devices)',
      '24/7 priority customer support',
      'Strict no-log policy guaranteed',
      'Advanced security features & kill switch',
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Subscribe to KeenVPN
            </h1>
            <p className="text-xl text-muted-foreground">
              Get complete VPN protection for just $100 per year
            </p>
          </div>

          {!user ? (
            <Card className="border-primary/50 shadow-glow">
              <CardHeader>
                <CardTitle>Sign In to Continue</CardTitle>
                <CardDescription>
                  You need to sign in before subscribing to KeenVPN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in with Google'
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/50 shadow-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Signed in as:</span>{' '}
                    {user.email}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

            <div className="space-y-3">
              <Button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                size="lg"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  'Subscribe Now'
                )}
              </Button>

              <Button
                onClick={() => navigate('/account')}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Account
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              You will be redirected to Stripe's secure checkout page
            </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscribe;

