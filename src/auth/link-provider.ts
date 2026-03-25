import { BACKEND_URL } from './backend';
import { getSessionToken } from './backend';

export interface LinkProviderCheckResult {
  action: 'already_linked' | 'fresh_link' | 'merge_required' | 'blocked';
  secondaryUser?: {
    id: string;
    email: string;
    provider: string;
    hasActiveSubscription: boolean;
  };
  reason?: string;
  error?: string;
}

export interface LinkProviderConfirmResult {
  success: boolean;
  action?: 'linked' | 'merged';
  linkedProviders?: string[];
  newSessionToken?: string;
  error?: string;
}

export async function checkLinkProvider(
  provider: 'google' | 'apple',
  idToken: string,
): Promise<LinkProviderCheckResult> {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return { action: 'blocked', error: 'Not authenticated' };
    }

    const response = await fetch(`${BACKEND_URL}/auth/link-provider/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ provider, idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        action: 'blocked',
        error: data.message || data.error || 'Check failed',
      };
    }

    return data;
  } catch (error) {
    return {
      action: 'blocked',
      error: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

export async function confirmLinkProvider(
  provider: 'google' | 'apple',
  idToken: string,
): Promise<LinkProviderConfirmResult> {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${BACKEND_URL}/auth/link-provider/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ provider, idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Confirm failed',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Confirm failed',
    };
  }
}
