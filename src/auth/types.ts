import { User as FirebaseUser } from 'firebase/auth';

export interface SubscriptionData {
  status: string;
  endDate: string;
  customerId?: string;
  plan?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionType?: string;
}

export interface TrialData {
  active: boolean;
  endsAt: string | null;
  daysRemaining: number | null;
  isPaid?: boolean;
  tier?: string | null;
}

export interface AuthState {
  user: FirebaseUser | null;
  subscription: SubscriptionData | null;
  trial: TrialData | null;
  loading: boolean;
}

export interface BackendAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    provider: string;
    contactEmail?: string | null;
    contactEmailVerified?: boolean;
    shouldPromptContactEmail?: boolean;
  };
  sessionToken?: string;
  subscription?: SubscriptionData | null;
  trial?: TrialData | null;
  error?: string;
  /** When true, backend rejected the token (401 or invalid); safe to clear session. When false/undefined on failure, do not clear (e.g. network error). */
  unauthorized?: boolean;
}

