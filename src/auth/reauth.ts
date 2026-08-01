import { clearSessionToken } from "./backend";
import { signOut } from "./firebase";

/**
 * Clear both authentication layers before asking the user to sign in again.
 * Clearing only the backend token allows Firebase to silently recreate a
 * session for the same account, which prevents intentional account switching.
 */
export async function resetAuthenticationForReauth(): Promise<void> {
  try {
    await signOut();
  } catch {
    // A stale or partially initialized Firebase session may not sign out
    // cleanly. The backend token must still be removed before redirecting.
  } finally {
    clearSessionToken();
  }
}
