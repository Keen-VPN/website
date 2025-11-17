import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, ExternalLink, LogOut, Shield, CreditCard, Calendar, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextNew';
import { useToast } from '@/hooks/use-toast';
import { deleteAccount, getSessionToken } from '@/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://vpnkeen.netlify.app/api';

const Account = () => {
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, logout, subscription, refreshSubscription } = useAuth();

  // Check for ASWebSession when account page loads and show deeplink modal if needed
  useEffect(() => {
    if (!loading && user) {
      // Check if this is from ASWebAuthenticationSession (macOS desktop app)
      const urlParams = new URLSearchParams(window.location.search);
      const isASWebSession = urlParams.get('asweb') === '1' || sessionStorage.getItem('asweb_session') === '1';
      
      if (isASWebSession) {
        // Store flag in sessionStorage if from URL param
        if (urlParams.get('asweb') === '1') {
          sessionStorage.setItem('asweb_session', '1');
        }
        
        // Get session token and trigger deeplink modal
        const sessionToken = getSessionToken();
        if (sessionToken) {
          console.log('🔐 Account page: ASWebSession detected, deeplink modal should show via AuthContext');
          // The modal will be shown by AuthContext's initializeAuth, but we ensure flag is set
        }
      }
    }
  }, [user, loading]);

  const handleRefreshSubscription = async () => {
    setSubscriptionLoading(true);
    await refreshSubscription();
    setSubscriptionLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    try {
      setCancelling(true);
      
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${BACKEND_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Subscription Cancelled',
          description: 'Your subscription will remain active until the end of your billing period.',
        });
        // Refresh subscription status
        await refreshSubscription();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email || !user.uid) return;

    try {
      setDeleting(true);
      
      const result = await deleteAccount(user.email, user.uid);

      if (result.success) {
        toast({
          title: 'Account Deleted',
          description: 'Your account and all associated data have been permanently deleted.',
        });
        
        // Sign out and redirect to home
        await logout();
        navigate('/');
      } else {
        throw new Error(result.error || 'Failed to delete account');
      }
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'past_due': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'past_due': return 'Past Due';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 bg-gradient-hero flex items-center justify-center">
          <Card className="max-w-md w-full text-center border-primary/50 shadow-glow">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to view your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/subscribe')} className="w-full">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">My Account</h1>
            <p className="text-xl text-muted-foreground">
              Manage your KeenVPN subscription and account settings
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Account Info */}
            <Card className="border-primary/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">Google</p>
                </div>
                <Button
                  onClick={logout}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="border-primary/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : subscription ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={`${getStatusColor(subscription.status)} text-white`}>
                        {getStatusText(subscription.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium">{subscription.plan || 'KeenVPN Premium'}</p>
                    </div>
                    
                    {/* Auto-Renewal Status */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Auto-Renewal</p>
                        <p className="text-xs text-muted-foreground">
                          {subscription.cancelAtPeriodEnd 
                            ? 'Cancelled - subscription ends on billing date' 
                            : 'Active - automatically renews each period'}
                        </p>
                      </div>
                      {subscription.cancelAtPeriodEnd ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Off
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          On
                        </Badge>
                      )}
                    </div>
                    
                    {subscription.endDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {subscription.cancelAtPeriodEnd ? 'Subscription Ends' : 'Next Billing'}
                          </p>
                          <p className="font-medium">{formatDate(subscription.endDate)}</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Button
                        onClick={handleRefreshSubscription}
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={subscriptionLoading}
                      >
                        {subscriptionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          'Refresh Status'
                        )}
                      </Button>

                      {subscription.status === 'active' ? (
                        <>
                          {!subscription.cancelAtPeriodEnd ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Turn Off Auto-Renewal
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                                    Turn Off Auto-Renewal
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to turn off auto-renewal? 
                                    <br /><br />
                                    <strong>What happens:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>Your subscription will remain active until <strong>{formatDate(subscription.endDate)}</strong></li>
                                      <li>You will NOT be charged again</li>
                                      <li>You can re-enable auto-renewal anytime before this date</li>
                                      <li>After this date, you'll need to subscribe again to continue using KeenVPN</li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Auto-Renewal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {cancelling ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      'Yes, Turn Off Auto-Renewal'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <>
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                                <div className="flex items-start">
                                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800">
                                      Auto-Renewal Cancelled
                                    </p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                      Your subscription will end on <strong>{formatDate(subscription.endDate)}</strong>
                                      <br />
                                      You will not be charged again unless you re-enable auto-renewal.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => {
                                  toast({
                                    title: 'Re-enable Auto-Renewal',
                                    description: 'Please contact support to re-enable auto-renewal, or subscribe again after your current period ends.',
                                  });
                                }}
                                variant="outline"
                                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Re-enable Auto-Renewal
                              </Button>
                            </>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => navigate('/subscribe')}
                          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                        >
                          Subscribe Now
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-center py-4">
                      No active subscription found
                    </p>
                    <Button
                      onClick={() => navigate('/subscribe')}
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      Subscribe Now
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Support Section */}
          <Card className="mt-8 border-primary/50 shadow-glow">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Contact our support team for assistance with your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/support')}
                variant="outline"
                className="w-full"
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="mt-8 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-destructive">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your data from our servers.
                      </p>
                      <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                        <p className="text-sm font-medium text-destructive">
                          This will delete:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                          <li>Your account and profile information</li>
                          <li>All subscription data</li>
                          <li>All associated preferences and settings</li>
                        </ul>
                      </div>
                      {subscription && subscription.status === 'active' && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ You have an active subscription
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Please cancel your subscription before deleting your account to avoid future charges.
                          </p>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
