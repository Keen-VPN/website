import { User as FirebaseUser } from 'firebase/auth';

export interface SubscriptionData {
  status: string;
  endDate: string;
  customerId?: string;
  plan?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface AuthState {
  user: FirebaseUser | null;
  subscription: SubscriptionData | null;
  loading: boolean;
}

export interface BackendAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    provider: string;
  };
  sessionToken?: string;
  subscription?: SubscriptionData;
  error?: string;
}

