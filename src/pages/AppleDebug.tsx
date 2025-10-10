import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextNew';
import { signInWithApple } from '@/auth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AppleDebug = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const testAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithApple();
      console.log('🍎 Apple Sign-In Result:', result);
      
      if (result.success && result.user) {
        // Extract debug information
        const providerData = result.user.providerData?.[0];
        const providerId = providerData?.providerId || '';
        const isApple = providerId.includes('apple');
        
        const debugData = {
          timestamp: new Date().toISOString(),
          firebaseUid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          providerData: result.user.providerData,
          firstProvider: providerData,
          providerId: providerId,
          isAppleProvider: isApple,
          providerDataUid: providerData?.uid,
          accessToken: result.accessToken?.substring(0, 20) + '...',
          credential: result.credential ? {
            providerId: result.credential.providerId,
            accessToken: result.credential.accessToken?.substring(0, 20) + '...',
            idToken: result.credential.idToken?.substring(0, 20) + '...'
          } : null,
          extractedAppleUserId: isApple && providerData?.uid !== result.user.uid 
            ? providerData.uid 
            : result.user.uid,
          isAppleUserIdExtracted: isApple && providerData?.uid !== result.user.uid,
          isPrivateRelayEmail: result.user.email?.includes('@privaterelay.appleid.com') || false,
          emailType: result.user.email?.includes('@privaterelay.appleid.com') ? 'Private Relay' : 'Real Email'
        };
        
        setDebugInfo(debugData);
        
        toast({
          title: "Apple Sign-In Debug Complete",
          description: "Check the debug information below",
        });
      }
    } catch (error) {
      console.error('❌ Apple Sign-In Debug Error:', error);
      toast({
        title: "Apple Sign-In Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (debugInfo) {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to Clipboard",
        description: "Debug information copied to clipboard",
      });
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = (status: boolean) => {
    return status ? 'SUCCESS' : 'FAILED';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Apple Sign-In Debug Tool
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Debug Apple Sign-In user identifier extraction and matching
            </p>
          </div>

          {/* Current User Info */}
          {user && (
            <Card className="mb-8 border-primary/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Current User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Firebase UID</p>
                    <p className="font-mono text-sm break-all">{user.uid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{user.displayName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider Data</p>
                    <div className="text-xs">
                      {user.providerData?.map((provider, index) => (
                        <div key={index} className="mb-1">
                          <span className="font-medium">{provider.providerId}</span>
                          <br />
                          <span className="font-mono text-xs break-all">{provider.uid}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Button */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Test Apple Sign-In</CardTitle>
              <CardDescription>
                Click the button below to test Apple Sign-In and see detailed debug information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={testAppleSignIn}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Apple Sign-In...
                  </>
                ) : (
                  'Test Apple Sign-In'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Debug Results */}
          {debugInfo && (
            <Card className="border-blue-500/50 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-blue-500" />
                    Debug Results
                  </span>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Detailed information about Apple Sign-In process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Apple Provider Detected</p>
                    <Badge className={getStatusColor(debugInfo.isAppleProvider)}>
                      {getStatusText(debugInfo.isAppleProvider)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Apple User ID Extracted</p>
                    <Badge className={getStatusColor(debugInfo.isAppleUserIdExtracted)}>
                      {getStatusText(debugInfo.isAppleUserIdExtracted)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider ID</p>
                    <p className="font-mono text-sm">{debugInfo.providerId}</p>
                  </div>
                </div>

                {/* Identifiers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Identifiers</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Firebase UID:</p>
                        <p className="font-mono break-all">{debugInfo.firebaseUid}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Provider Data UID:</p>
                        <p className="font-mono break-all">{debugInfo.providerDataUid || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Extracted Apple User ID:</p>
                        <p className="font-mono break-all">{debugInfo.extractedAppleUserId}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">User Info</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email:</p>
                        <p className="break-all">{debugInfo.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Display Name:</p>
                        <p>{debugInfo.displayName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timestamp:</p>
                        <p className="text-xs">{debugInfo.timestamp}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Data */}
                <div>
                  <h4 className="font-medium mb-2">Raw Provider Data</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo.providerData, null, 2)}
                  </pre>
                </div>

                {/* Analysis */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Analysis</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Apple Provider:</strong> {debugInfo.isAppleProvider ? '✅ Detected' : '❌ Not detected'}
                    </p>
                    <p>
                      <strong>Email Type:</strong> {debugInfo.emailType}
                    </p>
                    <p>
                      <strong>Apple User ID Extraction:</strong> {debugInfo.isAppleUserIdExtracted ? '✅ Success' : '❌ Failed - using Firebase UID'}
                    </p>
                    <p>
                      <strong>Cross-Platform Matching:</strong> {debugInfo.isAppleUserIdExtracted ? '✅ Will work' : '❌ Will create duplicate accounts'}
                    </p>
                    {debugInfo.isPrivateRelayEmail && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-2">
                        <p className="text-blue-800 font-medium">🍎 Private Relay Email Detected</p>
                        <p className="text-blue-700 text-xs mt-1">
                          This user chose "Hide My Email". Apple generates different relay emails for web vs desktop apps.
                          Cross-platform matching relies on Apple User ID, not email.
                        </p>
                      </div>
                    )}
                    {!debugInfo.isAppleUserIdExtracted && (
                      <p className="text-red-600 font-medium">
                        ⚠️ This will cause duplicate accounts when user logs in from desktop app!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How to Use This Tool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Test Apple Sign-In</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Test Apple Sign-In" and complete the Apple authentication flow.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Check Results</h4>
                <p className="text-sm text-muted-foreground">
                  Look for "Apple User ID Extracted: SUCCESS" - this means cross-platform matching will work.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Copy Debug Info</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Copy" button to copy debug information for analysis.
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium mb-2 text-yellow-800">⚠️ Important</h4>
                <p className="text-sm text-yellow-700">
                  If "Apple User ID Extracted" shows FAILED, the user will create duplicate accounts when switching between web and desktop app.
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium mb-2 text-blue-800">🍎 About Private Relay Emails</h4>
                <p className="text-sm text-blue-700">
                  When users choose "Hide My Email", Apple generates different relay emails for different platforms.
                  Web might get <code>abc123@privaterelay.appleid.com</code> while desktop gets <code>xyz789@privaterelay.appleid.com</code>.
                  This is why we rely on Apple User ID for cross-platform matching, not email.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AppleDebug;
