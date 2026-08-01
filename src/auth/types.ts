import { User as FirebaseUser } from "firebase/auth";

export interface AnnualSavingsData {
  savingsPercent: number;
  yearlySavingsAmount: number;
  annualMonthlyEquivalent: number;
}

export interface ScheduledBillingInterval {
  from: "month" | "year";
  to: "month" | "year";
  /** ISO timestamp when known; empty string when the backend omitted it. */
  effectiveAt: string;
}

export interface SubscriptionData {
  status: string;
  endDate: string;
  customerId?: string;
  plan?: string;
  planId?: string | null;
  seatLimit?: number;
  cancelAtPeriodEnd?: boolean;
  subscriptionType?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  billingPeriod?: "month" | "year" | null;
  subscriptionStartedAt?: string | null;
  daysSinceSubscriptionStart?: number | null;
  showAnnualUpgradePrompt?: boolean;
  scheduledBillingInterval?: ScheduledBillingInterval | null;
  accessRole?: "owner" | "linked" | "member";
  canManageBilling: boolean;
}

export interface TrialData {
  active: boolean;
  endsAt: string | null;
  daysRemaining: number | null;
  isPaid?: boolean;
  tier?: string | null;
}

export type WorkspaceEntitlementReason =
  | "active_subscription"
  | "active_trial"
  | "not_eligible";

export interface UserEntitlements {
  workspace: {
    enabled: boolean;
    reason: WorkspaceEntitlementReason;
  };
}

export interface AuthState {
  user: FirebaseUser | null;
  subscription: SubscriptionData | null;
  trial: TrialData | null;
  entitlements: UserEntitlements | null;
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
    createdUser?: boolean;
    shouldPromptSignupSource?: boolean;
  };
  sessionToken?: string;
  createdUser?: boolean;
  subscription?: SubscriptionData | null;
  trial?: TrialData | null;
  redditTrialConversionId?: string | null;
  error?: string;
  /** When true, backend rejected the token (401 or invalid); safe to clear session. When false/undefined on failure, do not clear (e.g. network error). */
  unauthorized?: boolean;
}
