import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { linkProvider, unlinkProvider } from '@/auth/backend';
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
  currentProvider?: string;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  } | null;
  onUpdate: () => void;
}

export function LinkedAccounts({ sessionToken, currentProvider, providers, onUpdate }: LinkedAccountsProps) {
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
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
          const pendingCredential = provider === 'google'
            ? GoogleAuthProvider.credentialFromError(fbErr)
            : OAuthProvider.credentialFromError(fbErr);

          if (!pendingCredential) {
            const oauthIdToken = fbErr?.customData?._tokenResponse?.oauthIdToken;
            const oauthAccessToken = fbErr?.customData?._tokenResponse?.oauthAccessToken;
            if (oauthIdToken && provider === 'apple') {
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
          // Provider already linked on Firebase side (e.g. re-linking after backend unlink).
          // Get a fresh token from the current user and proceed to sync with backend.
          firebaseIdToken = await currentUser.getIdToken(true);
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

  const handleUnlink = async (provider: 'google' | 'apple') => {
    setUnlinking(provider);
    try {
      await unlinkProvider(sessionToken, provider);
      toast({
        title: 'Account unlinked',
        description: `${provider === 'google' ? 'Google' : 'Apple'} account unlinked successfully.`,
      });
      onUpdate();
    } catch (error: unknown) {
      const message = (error instanceof Error ? error.message : null) || 'Failed to unlink account';
      toast({ title: 'Unlinking failed', description: message, variant: 'destructive' });
    } finally {
      setUnlinking(null);
    }
  };

  if (!providers) return null;

  const isGoogle = currentProvider === 'google.com' || currentProvider === 'google';
  const isApple = currentProvider === 'apple.com' || currentProvider === 'apple';

  const showGoogle = !isGoogle;
  const showApple = !isApple;

  if (!showGoogle && !showApple) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary provider indicator */}
        <div className="flex items-center justify-between">
          <span className="font-medium">{isGoogle ? 'Google' : 'Apple'}</span>
          <Badge variant="outline">Primary</Badge>
        </div>

        {showGoogle && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Google</span>
            {providers.google.linked ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unlinking !== null}
                  >
                    {unlinking === 'google' ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Google Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The linked account will lose access to any shared subscription.
                      You can re-link later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUnlink('google')}>
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unlinking !== null}
                  >
                    {unlinking === 'apple' ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Apple Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The linked account will lose access to any shared subscription.
                      You can re-link later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUnlink('apple')}>
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
