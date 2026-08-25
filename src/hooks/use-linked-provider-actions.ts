import { useCallback, useState } from "react";
import {
  linkWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth as getSecondaryAuth,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { useToast } from "@/hooks/use-toast";
import { linkProvider, unlinkProvider } from "@/auth/backend";
import { getFirebaseAuth, getFirebaseApp } from "@/auth/firebase";

export type LinkedAuthProvider = "google" | "apple";

interface UseLinkedProviderActionsOptions {
  sessionToken: string | null | undefined;
  onUpdated: () => void | Promise<void>;
  /** Toast copy variants — dashboard uses "connect/disconnect". */
  labels?: "link" | "connect";
}

function providerLabel(provider: LinkedAuthProvider) {
  return provider === "google" ? "Google" : "Apple";
}

/**
 * Shared Google/Apple link + unlink flow (popup, credential-already-in-use
 * temp-app handoff, backend sync). Used by LinkedAccounts and Dashboard Profile.
 */
export function useLinkedProviderActions({
  sessionToken,
  onUpdated,
  labels = "link",
}: UseLinkedProviderActionsOptions) {
  const { toast } = useToast();
  const [linking, setLinking] = useState<LinkedAuthProvider | null>(null);
  const [unlinking, setUnlinking] = useState<LinkedAuthProvider | null>(null);

  const successVerb = labels === "connect" ? "connected" : "linked";
  const failVerb = labels === "connect" ? "Connection" : "Linking";
  const unlinkSuccess = labels === "connect" ? "disconnected" : "unlinked";
  const unlinkFail = labels === "connect" ? "Disconnect" : "Unlinking";

  const linkAccount = useCallback(
    async (provider: LinkedAuthProvider) => {
      if (!sessionToken) {
        toast({
          title: "Sign in required",
          description: "Sign in to connect accounts.",
          variant: "destructive",
        });
        return;
      }

      setLinking(provider);
      try {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast({
            title: "Error",
            description: "You must be signed in to link accounts.",
            variant: "destructive",
          });
          return;
        }

        const authProvider =
          provider === "google"
            ? new GoogleAuthProvider()
            : new OAuthProvider("apple.com");

        let firebaseIdToken: string;

        try {
          const result = await linkWithPopup(currentUser, authProvider);
          firebaseIdToken = await result.user.getIdToken(true);
        } catch (firebaseError: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Firebase errors have dynamic structure
          const fbErr = firebaseError as any;
          if (fbErr?.code === "auth/credential-already-in-use") {
            const pendingCredential =
              provider === "google"
                ? GoogleAuthProvider.credentialFromError(fbErr)
                : OAuthProvider.credentialFromError(fbErr);

            if (!pendingCredential) {
              const oauthIdToken =
                fbErr?.customData?._tokenResponse?.oauthIdToken;
              const oauthAccessToken =
                fbErr?.customData?._tokenResponse?.oauthAccessToken;
              if (oauthIdToken && provider === "apple") {
                const manualCredential = new OAuthProvider(
                  "apple.com",
                ).credential({
                  idToken: oauthIdToken,
                  accessToken: oauthAccessToken,
                });
                const app = getFirebaseApp();
                const tempApp = initializeApp(
                  app.options,
                  "temp-link-" + Date.now(),
                );
                const tempAuth = getSecondaryAuth(tempApp);
                try {
                  const tempResult = await signInWithCredential(
                    tempAuth,
                    manualCredential,
                  );
                  firebaseIdToken = await tempResult.user.getIdToken();
                  await tempAuth.signOut();
                } catch {
                  toast({
                    title: "Error",
                    description:
                      "Could not verify the Apple account. Please try again.",
                    variant: "destructive",
                  });
                  return;
                } finally {
                  await deleteApp(tempApp).catch(() => undefined);
                }
              } else {
                toast({
                  title: "Error",
                  description:
                    "Could not retrieve credentials. Please try again.",
                  variant: "destructive",
                });
                return;
              }
            } else {
              const app = getFirebaseApp();
              const tempApp = initializeApp(
                app.options,
                "temp-link-" + Date.now(),
              );
              const tempAuth = getSecondaryAuth(tempApp);
              try {
                const tempResult = await signInWithCredential(
                  tempAuth,
                  pendingCredential,
                );
                firebaseIdToken = await tempResult.user.getIdToken();
                await tempAuth.signOut();
              } catch {
                toast({
                  title: "Error",
                  description:
                    "Could not verify the second account. Please try again.",
                  variant: "destructive",
                });
                return;
              } finally {
                await deleteApp(tempApp).catch(() => undefined);
              }
            }
          } else if (fbErr?.code === "auth/popup-closed-by-user") {
            return;
          } else if (fbErr?.code === "auth/provider-already-linked") {
            firebaseIdToken = await currentUser.getIdToken(true);
          } else {
            throw firebaseError;
          }
        }

        const result = await linkProvider(
          sessionToken,
          provider,
          firebaseIdToken,
        );
        if (!result.success) {
          toast({
            title: `${failVerb} failed`,
            description:
              result.error ?? "Could not connect account. Please try again.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: `Account ${successVerb}`,
          description: `${providerLabel(provider)} account ${successVerb} successfully.`,
        });
        await onUpdated();
      } catch (error: unknown) {
        const message =
          (error instanceof Error ? error.message : null) ||
          "Failed to link account";
        toast({
          title: `${failVerb} failed`,
          description: message,
          variant: "destructive",
        });
      } finally {
        setLinking(null);
      }
    },
    [sessionToken, toast, onUpdated, failVerb, successVerb],
  );

  const unlinkAccount = useCallback(
    async (provider: LinkedAuthProvider) => {
      if (!sessionToken) return;
      setUnlinking(provider);
      try {
        await unlinkProvider(sessionToken, provider);
        toast({
          title: `Account ${unlinkSuccess}`,
          description: `${providerLabel(provider)} account ${unlinkSuccess} successfully.`,
        });
        await onUpdated();
      } catch (error: unknown) {
        const message =
          (error instanceof Error ? error.message : null) ||
          "Failed to unlink account";
        toast({
          title: `${unlinkFail} failed`,
          description: message,
          variant: "destructive",
        });
      } finally {
        setUnlinking(null);
      }
    },
    [sessionToken, toast, onUpdated, unlinkSuccess, unlinkFail],
  );

  return {
    linking,
    unlinking,
    linkAccount,
    unlinkAccount,
  };
}
