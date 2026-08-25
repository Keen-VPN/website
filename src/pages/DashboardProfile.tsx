import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Apple,
  Loader2,
} from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog";
import GoogleIcon from "@/components/ui/google-icon";
import { UserInformationCard } from "@/components/UserInformationCard";
import { AuthEmailCard } from "@/components/AuthEmailCard";
import { cn } from "@/lib/utils";
import { hasManageableSubscription, canCancelStripeOnWebsite, isAppleIapSubscription } from "@/lib/subscription-cta";
import { AppleIapSubscriptionsCta } from "@/components/AppleIapSubscriptionsCta";
import { useLinkedProviderActions } from "@/hooks/use-linked-provider-actions";
import {
  deleteAccount,
  fetchMyEmailCategoryPreferences,
  getSessionToken,
  updateMyEmailCategoryPreferences,
  type EmailCategoryPreference,
} from "@/auth/backend";

const cardClass =
  "rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-7";

const outlineBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-[#0f2040]/25 bg-white px-4 text-[13px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50";

const dangerBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-[#f0b4b4] bg-white px-4 text-[13px] font-semibold text-[#d14343] transition-colors hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-50";

/** Figma-matched toggle: navy on / grey off, white knob with inset padding. */
function ProfileToggle({
  checked,
  onCheckedChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <SwitchPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "peer inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2040]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[#0f2040] data-[state=unchecked]:bg-[#d5dbe6]",
      )}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0px_1px_3px_rgba(15,32,64,0.22)] ring-0 transition-transform",
          "data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
}

const PREVIEW_PREFERENCES: EmailCategoryPreference[] = [
  {
    category: "product_updates",
    label: "Product Update",
    description:
      "New features, server locations and important KeenVPN product announcements.",
    subscribed: true,
  },
  {
    category: "education_privacy",
    label: "Education, Privacy & Security",
    description: "Privacy tips, security guidance and useful VPN resources.",
    subscribed: true,
  },
  {
    category: "perks_offers",
    label: "Perks & Offers",
    description: "KeenVPN perks, promotions and eligible special offers.",
    subscribed: false,
  },
  {
    category: "referrals",
    label: "Referral",
    description: "Referral opportunities and rewards.",
    subscribed: false,
  },
];

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#0f2040]">
        {title}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
        {description}
      </p>
    </div>
  );
}

export default function DashboardProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    subscription,
    linkedProviders,
    authProvider,
    hasSessionToken,
    refreshLinkedProviders,
    logout,
  } = useAuth();

  const sessionToken = hasSessionToken ? getSessionToken() : null;
  const prefsLoadGen = useRef(0);

  // ── Connected accounts ─────────────────────────────────────────────────────
  const {
    linking,
    unlinking,
    linkAccount: handleLink,
    unlinkAccount: handleUnlink,
  } = useLinkedProviderActions({
    sessionToken,
    onUpdated: refreshLinkedProviders,
    labels: "connect",
  });

  // ── Email preferences ──────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<EmailCategoryPreference[]>(
    [],
  );
  const [prefsLoading, setPrefsLoading] = useState(Boolean(sessionToken));
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsLoadError, setPrefsLoadError] = useState<string | null>(null);
  const [prefsReady, setPrefsReady] = useState(!sessionToken);

  // ── Delete account ─────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!sessionToken) {
      setPreferences(PREVIEW_PREFERENCES);
      setPrefsReady(false);
      setPrefsLoadError(null);
      setPrefsLoading(false);
      return;
    }
    const generation = ++prefsLoadGen.current;
    setPrefsLoading(true);
    setPrefsLoadError(null);
    const response = await fetchMyEmailCategoryPreferences(sessionToken);
    if (generation !== prefsLoadGen.current) return;
    if (response.success && response.preferences) {
      setPreferences(response.preferences);
      setPrefsReady(true);
      setPrefsLoadError(null);
    } else {
      setPreferences([]);
      setPrefsReady(false);
      setPrefsLoadError(
        response.error?.trim() ||
          "Could not load email preferences. Try again.",
      );
    }
    setPrefsLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void loadPreferences();
    if (sessionToken) {
      void refreshLinkedProviders();
    }
    return () => {
      prefsLoadGen.current += 1;
    };
  }, [loadPreferences, refreshLinkedProviders, sessionToken]);

  async function handleTogglePreference(
    category: string,
    subscribed: boolean,
  ) {
    if (!sessionToken || !prefsReady || prefsLoadError) return;
    const previous = preferences;
    const next = preferences.map((row) =>
      row.category === category ? { ...row, subscribed } : row,
    );
    setPreferences(next);
    setPrefsSaving(true);
    const payload = Object.fromEntries(
      next.map((row) => [row.category, row.subscribed]),
    );
    const response = await updateMyEmailCategoryPreferences(
      sessionToken,
      payload,
    );
    setPrefsSaving(false);

    if (!response.success || !response.preferences) {
      setPreferences(previous);
      toast({
        title: "Could not save preferences",
        description: response.error ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setPreferences(response.preferences);
  }

  async function handleDeleteAccount() {
    if (!sessionToken) {
      toast({
        title: "Sign in required",
        description: "Sign in to delete your account.",
        variant: "destructive",
      });
      return;
    }
    if (canCancelStripeOnWebsite(subscription)) {
      toast({
        title: "Cancel subscription first",
        description:
          "Turn off auto-renewal on the Subscription page before deleting your account.",
        variant: "destructive",
      });
      return;
    }
    try {
      setDeleting(true);
      const result = await deleteAccount(sessionToken);
      if (result.success) {
        toast({
          title: "Account deleted",
          description:
            "Your account and all associated data have been permanently deleted.",
        });
        await logout();
        navigate("/");
      } else {
        throw new Error(result.error || "Failed to delete account");
      }
    } catch (error) {
      toast({
        title: "Deletion failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  const googleLinked =
    (linkedProviders?.google.linked ?? false) ||
    authProvider === "google" ||
    authProvider === "google.com";
  const appleLinked =
    (linkedProviders?.apple.linked ?? false) ||
    authProvider === "apple" ||
    authProvider === "apple.com";
  const providerBusy = linking !== null || unlinking !== null;
  const googleEmail = linkedProviders?.google.email;
  const appleEmail = linkedProviders?.apple.email;

  const isPrimaryGoogle =
    authProvider === "google" || authProvider === "google.com";
  const isPrimaryApple =
    authProvider === "apple" || authProvider === "apple.com";

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
        {/* Account details — shared AuthEmailCard (same flow as Settings) */}
        <section className={cardClass}>
          <SectionHeader
            title="Account details"
            description="Manage your personal information"
          />
          {sessionToken ? (
            <AuthEmailCard sessionToken={sessionToken} embedded />
          ) : (
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-dash-muted">
                Email address
              </p>
              <p className="mt-1 break-all text-[14px] font-medium text-dash-ink">
                —
              </p>
            </div>
          )}
        </section>

        {/* Connected accounts */}
        <section className={cardClass}>
          <SectionHeader
            title="Connected accounts"
            description="Manage third-party accounts connected to your KeenVPN account."
          />

          <div className="divide-y divide-[#eef2f7]">
            {/* Google */}
            <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <GoogleIcon className="h-4 w-4" />
                  <span className="text-[14px] font-semibold text-[#0f2040]">
                    Google
                  </span>
                  {googleLinked ? (
                    <span className="inline-flex items-center rounded-full bg-[#e6f9f0] px-2 py-0.5 text-[11px] font-semibold text-[#1a9e5a]">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-[#f0f3f8] px-2 py-0.5 text-[11px] font-semibold text-[#627086]">
                      Not connected
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] text-[#627086]">
                  {googleLinked
                    ? googleEmail
                      ? `Connected to ${googleEmail}`
                      : "Connected to your Google account."
                    : "Connect your Google account for faster sign-in."}
                </p>
              </div>
              {googleLinked ? (
                isPrimaryGoogle ? (
                  <span className="text-[12px] font-medium text-[#627086]">
                    Primary
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className={dangerBtnClass}
                        disabled={providerBusy}
                      >
                        {unlinking === "google" ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Disconnect Google account?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          The linked account will lose access to any shared
                          subscription. You can reconnect later if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleUnlink("google")}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              ) : (
                <button
                  type="button"
                  className={outlineBtnClass}
                  disabled={providerBusy}
                  onClick={() => void handleLink("google")}
                >
                  {linking === "google" ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    "Connect"
                  )}
                </button>
              )}
            </div>

            {/* Apple */}
            <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Apple className="h-4 w-4 fill-current text-[#0f2040]" />
                  <span className="text-[14px] font-semibold text-[#0f2040]">
                    Apple
                  </span>
                  {appleLinked ? (
                    <span className="inline-flex items-center rounded-full bg-[#e6f9f0] px-2 py-0.5 text-[11px] font-semibold text-[#1a9e5a]">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-[#f0f3f8] px-2 py-0.5 text-[11px] font-semibold text-[#627086]">
                      Not connected
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] text-[#627086]">
                  {appleLinked
                    ? appleEmail
                      ? `Connected to ${appleEmail}`
                      : "Connected to your Apple account."
                    : "Connect your Apple account for faster sign-in."}
                </p>
              </div>
              {appleLinked ? (
                isPrimaryApple ? (
                  <span className="text-[12px] font-medium text-[#627086]">
                    Primary
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className={dangerBtnClass}
                        disabled={providerBusy}
                      >
                        {unlinking === "apple" ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Disconnect Apple account?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          The linked account will lose access to any shared
                          subscription. You can reconnect later if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleUnlink("apple")}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              ) : (
                <button
                  type="button"
                  className={outlineBtnClass}
                  disabled={providerBusy}
                  onClick={() => void handleLink("apple")}
                >
                  {linking === "apple" ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    "Connect"
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* User information (optional profile Q&A from old Account page) */}
        {sessionToken ? (
          <UserInformationCard
            sessionToken={sessionToken}
            entrySource="dashboard_profile"
            variant="dashboard"
          />
        ) : null}

        {/* Email Preferences */}
        <section className={cardClass}>
          <SectionHeader
            title="Email Preferences"
            description="Customize your email preference."
          />

          {prefsLoading ? (
            <div className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : prefsLoadError ? (
            <div className="rounded-[10px] border border-[#f0c2c2] bg-[#fff5f5] px-4 py-3">
              <p className="text-sm text-[#d14343]">{prefsLoadError}</p>
              <button
                type="button"
                className="mt-3 text-[13px] font-semibold text-[#0f2040] underline"
                onClick={() => void loadPreferences()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#eef2f7]">
              {preferences.map((row) => (
                <div
                  key={row.category}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#0f2040]">
                      {row.label}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
                      {row.description}
                    </p>
                  </div>
                  <ProfileToggle
                    checked={row.subscribed}
                    disabled={
                      !sessionToken ||
                      prefsSaving ||
                      !prefsReady ||
                      Boolean(prefsLoadError)
                    }
                    aria-label={row.label}
                    onCheckedChange={(checked) =>
                      void handleTogglePreference(row.category, checked)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Account deletion */}
        <section className={cardClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0f0]">
                <AlertTriangle className="h-4 w-4 text-[#d14343]" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#0f2040]">
                  Account deletion
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
                  Permanently delete your account and all associated data. Once
                  you delete your account, there&apos;s no going back. Please
                  download any important data before proceeding.
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className={dangerBtnClass}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete account"
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="gap-5 border-[#e3e8f0] bg-white p-6 shadow-[0px_16px_40px_rgba(15,32,64,0.16)] sm:rounded-[16px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#d14343]">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-left text-[14px] leading-relaxed text-[#0f2040]/80">
                      <p>
                        This action{" "}
                        <strong className="font-semibold text-[#0f2040]">
                          cannot be undone
                        </strong>
                        . Your account and all associated usage data will be
                        permanently deleted from our servers. Please note that
                        no refunds will be issued.
                      </p>
                      <div className="rounded-[10px] border border-[#f0c2c2] bg-[#fff5f5] p-3">
                        <p className="text-sm font-semibold text-[#d14343]">
                          This will delete:
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#43516a]">
                          <li>Your account and profile information</li>
                          <li>All subscription data</li>
                          <li>All associated preferences and settings</li>
                        </ul>
                      </div>
                      {canCancelStripeOnWebsite(subscription) ? (
                        <div className="rounded-[10px] border border-[#f0c2c2] bg-[#fff8f8] p-3">
                          <p className="text-sm font-semibold text-[#0f2040]">
                            You have an active subscription
                          </p>
                          <p className="mt-1 text-xs text-[#43516a]">
                            Cancel auto-renewal first, then delete your account
                            to avoid future charges.
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-[12px] font-semibold text-[#0f2040] underline"
                            onClick={() => navigate("/subscription")}
                          >
                            Manage subscription
                          </button>
                        </div>
                      ) : isAppleIapSubscription(subscription) &&
                        hasManageableSubscription(subscription) &&
                        !subscription?.cancelAtPeriodEnd ? (
                        <div className="rounded-[10px] border border-[#f0c2c2] bg-[#fff8f8] p-3">
                          <p className="text-sm font-semibold text-[#0f2040]">
                            App Store subscription
                          </p>
                          <p className="mt-1 text-xs text-[#43516a]">
                            Cancel auto-renewal in Apple Subscriptions before or
                            after deleting this account to avoid future charges.
                          </p>
                          <div className="mt-3">
                            <AppleIapSubscriptionsCta />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="mt-0 h-9 rounded-[8px] border-[#dbe2ec] bg-white text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDeleteAccount()}
                    disabled={canCancelStripeOnWebsite(subscription)}
                    className="h-9 rounded-[8px] bg-[#d14343] text-[13px] font-semibold text-white hover:bg-[#d14343]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete Account Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </div>
  );
}
