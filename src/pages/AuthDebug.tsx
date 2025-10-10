import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getCurrentUser, getCurrentUserIdToken, getSessionToken } from '@/auth';
import { useAuth } from '@/contexts/AuthContextNew';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AuthDebug = () => {
  const { user, subscription, loading } = useAuth();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIdToken = async () => {
    setRefreshing(true);
    setTokenError(null);
    
    try {
      const token = await getCurrentUserIdToken(true);
      setIdToken(token);
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : 'Failed to fetch token');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchIdToken();
    }
  }, [user]);

  const sessionToken = getSessionToken();
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    backendUrl: import.meta.env.VITE_BACKEND_URL
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Authentication Debug
            </h1>
            <p className="text-muted-foreground">
              Diagnostic information for troubleshooting authentication issues
            </p>
          </div>

          <div className="grid gap-6">
            {/* Firebase Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Firebase Configuration</CardTitle>
                <CardDescription>Current Firebase project settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Project ID:</div>
                  <div className="font-mono">{firebaseConfig.projectId || '❌ Not set'}</div>
                  
                  <div className="text-muted-foreground">Auth Domain:</div>
                  <div className="font-mono">{firebaseConfig.authDomain || '❌ Not set'}</div>
                  
                  <div className="text-muted-foreground">API Key:</div>
                  <div className="font-mono">
                    {firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '❌ Not set'}
                  </div>
                  
                  <div className="text-muted-foreground">Backend URL:</div>
                  <div className="font-mono">{firebaseConfig.backendUrl || '❌ Not set'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Current User */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current User</span>
                  {user ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Authenticated
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Authenticated
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Firebase authentication state</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading...</p>
                  </div>
                ) : user ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">UID:</div>
                    <div className="font-mono break-all">{user.uid}</div>
                    
                    <div className="text-muted-foreground">Email:</div>
                    <div className="font-mono">{user.email}</div>
                    
                    <div className="text-muted-foreground">Display Name:</div>
                    <div className="font-mono">{user.displayName || 'N/A'}</div>
                    
                    <div className="text-muted-foreground">Email Verified:</div>
                    <div>
                      {user.emailVerified ? (
                        <Badge variant="default" className="bg-green-500">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>
                    
                    <div className="text-muted-foreground">Provider:</div>
                    <div className="font-mono">
                      {user.providerData?.[0]?.providerId || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No user is currently signed in
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ID Token */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Firebase ID Token</span>
                  <Button
                    onClick={fetchIdToken}
                    disabled={!user || refreshing}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>Current Firebase authentication token</CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to view ID token
                  </p>
                ) : tokenError ? (
                  <div className="flex items-start space-x-2 text-red-500">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div className="text-sm">{tokenError}</div>
                  </div>
                ) : idToken ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Token fetch successful</span>
                    </div>
                    <div className="bg-muted p-3 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
                      {idToken}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Token */}
            <Card>
              <CardHeader>
                <CardTitle>Session Token</CardTitle>
                <CardDescription>Backend session token stored in localStorage</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionToken ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Session token present</span>
                    </div>
                    <div className="bg-muted p-3 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
                      {sessionToken}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span className="text-sm">No session token found</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Subscription Status</span>
                  {subscription ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      No Subscription
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Current subscription information</CardDescription>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Status:</div>
                    <div className="font-mono">{subscription.status}</div>
                    
                    <div className="text-muted-foreground">Plan:</div>
                    <div className="font-mono">{subscription.plan || 'Premium'}</div>
                    
                    {subscription.endDate && (
                      <>
                        <div className="text-muted-foreground">End Date:</div>
                        <div className="font-mono">
                          {new Date(subscription.endDate).toLocaleDateString()}
                        </div>
                      </>
                    )}
                    
                    {subscription.cancelAtPeriodEnd !== undefined && (
                      <>
                        <div className="text-muted-foreground">Cancel at Period End:</div>
                        <div>
                          {subscription.cancelAtPeriodEnd ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="default">No</Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active subscription found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Environment Information</CardTitle>
                <CardDescription>Browser and system details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-muted-foreground">Current URL:</div>
                  <div className="font-mono break-all">{window.location.href}</div>
                  
                  <div className="text-muted-foreground">Origin:</div>
                  <div className="font-mono">{window.location.origin}</div>
                  
                  <div className="text-muted-foreground">User Agent:</div>
                  <div className="font-mono text-xs break-all">{navigator.userAgent}</div>
                  
                  <div className="text-muted-foreground">Online:</div>
                  <div>
                    {navigator.onLine ? (
                      <Badge variant="default" className="bg-green-500">Yes</Badge>
                    ) : (
                      <Badge variant="destructive">No</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthDebug;

