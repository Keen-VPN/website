import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { linkProvider } from '@/auth/backend';
import { getFirebaseAuth, getFirebaseApp } from '@/auth/firebase';
import {
  linkWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth as getSecondaryAuth,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';

interface LinkedAccountsProps {
  sessionToken: string;
  currentProvider?: string; // e.g. "google.com", "apple.com"
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  } | null;
  onUpdate: () => void;
}

export function LinkedAccounts({ sessionToken, currentProvider, providers, onUpdate }: LinkedAccountsProps) {
  const [linking, setLinking] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLink = async (provider: 'google' | 'apple') => {
    setLinking(provider);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({ title: 'Error', description: 'You must be signed in to link accounts.', variant: 'destructive' });
        return;
      }

      const authProvider = provider === 'google'
        ? new GoogleAuthProvider()
        : new OAuthProvider('apple.com');

      let firebaseIdToken: string;

      try {
        const result = await linkWithPopup(currentUser, authProvider);
        firebaseIdToken = await result.user.getIdToken(true);
      } catch (firebaseError: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Firebase errors have dynamic structure
        const fbErr = firebaseError as any;
        if (fbErr?.code === 'auth/credential-already-in-use') {
          // The other provider account already exists as a separate Firebase user.
          // We need to sign into THAT account to get its Firebase token for the backend.
          // Use a temporary Firebase app so we don't disturb the primary session.
          const pendingCredential = provider === 'google'
            ? GoogleAuthProvider.credentialFromError(fbErr)
            : OAuthProvider.credentialFromError(fbErr);

          if (!pendingCredential) {
            // Fallback: try to extract the OAuth credential directly from the error
            const oauthIdToken = fbErr?.customData?._tokenResponse?.oauthIdToken;
            const oauthAccessToken = fbErr?.customData?._tokenResponse?.oauthAccessToken;
            if (oauthIdToken && provider === 'apple') {
              // For Apple, we can construct the credential manually
              const manualCredential = new OAuthProvider('apple.com').credential({
                idToken: oauthIdToken,
                accessToken: oauthAccessToken,
              });
              try {
                const app = getFirebaseApp();
                const tempApp = initializeApp(app.options, 'temp-link-' + Date.now());
                const tempAuth = getSecondaryAuth(tempApp);
                const tempResult = await signInWithCredential(tempAuth, manualCredential);
                firebaseIdToken = await tempResult.user.getIdToken();
                await tempAuth.signOut();
                await deleteApp(tempApp);
              } catch {
                toast({ title: 'Error', description: 'Could not verify the Apple account. Please try again.', variant: 'destructive' });
                return;
              }
            } else {
              toast({ title: 'Error', description: 'Could not retrieve credentials. Please try again.', variant: 'destructive' });
              return;
            }
          } else {
            try {
              const app = getFirebaseApp();
              const tempApp = initializeApp(app.options, 'temp-link-' + Date.now());
              const tempAuth = getSecondaryAuth(tempApp);
              const tempResult = await signInWithCredential(tempAuth, pendingCredential);
              firebaseIdToken = await tempResult.user.getIdToken();
              await tempAuth.signOut();
              await deleteApp(tempApp);
            } catch {
              toast({ title: 'Error', description: 'Could not verify the second account. Please try again.', variant: 'destructive' });
              return;
            }
          }
        } else if (fbErr?.code === 'auth/popup-closed-by-user') {
          return;
        } else if (fbErr?.code === 'auth/provider-already-linked') {
          toast({ title: 'Already linked', description: 'This provider is already linked to your account.' });
          return;
        } else {
          throw firebaseError;
        }
      }

      const result = await linkProvider(sessionToken, provider, firebaseIdToken);
      if (result.success) {
        toast({ title: 'Account linked', description: `${provider === 'google' ? 'Google' : 'Apple'} account linked successfully.` });
        onUpdate();
      }
    } catch (error: unknown) {
      const message = (error instanceof Error ? error.message : null) || 'Failed to link account';
      toast({ title: 'Linking failed', description: message, variant: 'destructive' });
    } finally {
      setLinking(null);
    }
  };

  if (!providers) return null;

  // Only show the OTHER provider — hide the one the user is currently signed in with
  const isGoogle = currentProvider === 'google.com' || currentProvider === 'google';
  const isApple = currentProvider === 'apple.com' || currentProvider === 'apple';

  // If both are linked and we're hiding the current one, show just the other
  const showGoogle = !isGoogle;
  const showApple = !isApple;

  // Nothing to show if we'd hide everything
  if (!showGoogle && !showApple) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showGoogle && (
        <div className="flex items-center justify-between">
          <span className="font-medium">Google</span>
          {providers.google.linked ? (
              <Badge variant="secondary">Linked</Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLink('google')}
              disabled={linking !== null}
            >
              {linking === 'google' ? 'Linking...' : 'Link Google Account'}
            </Button>
          )}
        </div>
        )}
        {showApple && (
        <div className="flex items-center justify-between">
          <span className="font-medium">Apple</span>
          {providers.apple.linked ? (
              <Badge variant="secondary">Linked</Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLink('apple')}
              disabled={linking !== null}
            >
              {linking === 'apple' ? 'Linking...' : 'Link Apple Account'}
            </Button>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
