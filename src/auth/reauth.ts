import { clearSessionToken } from "./backend";
import { signOut } from "./firebase";

/**
 * Clear both authentication layers before asking the user to sign in again.
 * Clearing only the backend token allows Firebase to silently recreate a
 * session for the same account, which prevents intentional account switching.
 */
export async function resetAuthenticationForReauth(): Promise<boolean> {
  try {
    await signOut();
    clearSessionToken();
    return true;
  } catch {
    // Keep the existing backend session when Firebase sign-out fails. Callers
    // must surface the failure instead of redirecting into an account loop.
    return false;
  }
}
