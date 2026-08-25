import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Check,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Laptop,
  Loader2,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionBillingActions } from '@/hooks/use-subscription-billing-actions';
import { useSubscriptionHistory } from '@/hooks/useSubscriptionHistory';
import {
  createCheckoutSession,
  fetchSubscriptionPlans,
  getSessionToken,
  CHECKOUT_ERROR_SESSION_EXPIRED,
} from '@/auth/backend';
import { ApiPlan, getApiPlanPaidMonths, isTwoYearApiPlan } from '@/lib/pricing';
import {
  type SubscriptionEvent,
  formatCurrency,
  formatEventDate,
  getStatusInfo,
} from '@/lib/subscription-history-api';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionCancellationControls } from '@/components/SubscriptionCancellationControls';
import { SubscriptionEventDetail } from '@/components/SubscriptionEventDetail';
import { MembershipPlanUpgradeCard } from '@/components/MembershipPlanUpgradeCard';
import {
  MembershipSharingProvider,
  useMembershipSharingContext,
} from '@/contexts/MembershipSharingContext';
import {
  canUpgradeToBusinessPlan,
  hasManageableSubscription,
  isAppleIapSubscription,
  isStripeSubscription,
  resolveMembershipPlanTier,
  resolveSubscriptionBillingPeriod,
} from '@/lib/subscription-cta';
import type { SubscriptionData } from '@/auth/types';

type TabId = 'subscription' | 'plans' | 'billing';
type PlanTier = 'premium' | 'team';

const TABS: { id: TabId; label: string }[] = [
  { id: 'subscription', label: 'Subscription' },
  { id: 'plans', label: 'Plans' },
  { id: 'billing', label: 'Billing history' },
];

const FEATURES = [
  'Connect up to 10 devices simultaneously',
  '30-day money-back guarantee',
  '6,400+ servers across 111 countries',
  'Unlimited bandwidth & speed',
  'AES-256 military-grade encryption',
  '24/7 live chat & email support',
  'Strict no-logs privacy policy',
  'Automatic kill switch on all apps',
];

function getPlanBillingPeriod(plan: ApiPlan) {
  return plan.billingPeriod || plan.period;
}

function isAnnualPlan(plan: ApiPlan) {
  return !isTwoYearApiPlan(plan) && getPlanBillingPeriod(plan) === 'year';
}

function getPlanTier(plan: ApiPlan): PlanTier | 'other' {
  const id = plan.id.toLowerCase();
  // Retired Family catalog IDs should not appear under Individual checkout.
  // Keep family_plus / familyplus as Business (team).
  if (
    id.includes('family') &&
    !id.includes('family_plus') &&
    !id.includes('familyplus')
  ) {
    return 'other';
  }
  if (
    plan.isPerSeat ||
    id.includes('team') ||
    id.includes('business') ||
    id.includes('family_plus') ||
    id.includes('familyplus')
  ) {
    return 'team';
  }
  return 'premium';
}

function isCurrentCatalogPlan(
  plan: ApiPlan,
  subscription: SubscriptionData | null | undefined,
): boolean {
  if (!subscription || !hasManageableSubscription(subscription)) return false;
  if (subscription.planId && plan.id === subscription.planId) return true;

  const subTier = resolveMembershipPlanTier(subscription);
  const planTier = getPlanTier(plan) === 'team' ? 'business' : 'individual';
  if (subTier === 'family') return false;
  if (subTier !== planTier) return false;

  const subPeriod = resolveSubscriptionBillingPeriod(subscription);
  const planPeriod = isTwoYearApiPlan(plan)
    ? '2year'
    : isAnnualPlan(plan)
      ? 'year'
      : 'month';
  return subPeriod === planPeriod;
}

const BILLING_PERIOD_RANK: Record<'month' | 'year' | '2year', number> = {
  month: 0,
  year: 1,
  '2year': 2,
};

function planChangeCtaLabel(
  plan: ApiPlan,
  subscription: SubscriptionData,
): string {
  const targetBusiness = getPlanTier(plan) === 'team';
  const targetPeriod = isTwoYearApiPlan(plan)
    ? '2year'
    : isAnnualPlan(plan)
      ? 'year'
      : 'month';
  const currentBusiness =
    resolveMembershipPlanTier(subscription) === 'business';
  const currentPeriod = resolveSubscriptionBillingPeriod(subscription);

  const isUpgrade =
    (targetBusiness && !currentBusiness) ||
    (targetBusiness === currentBusiness &&
      BILLING_PERIOD_RANK[targetPeriod] > BILLING_PERIOD_RANK[currentPeriod]);

  const verb = isUpgrade ? 'Upgrade to' : 'Switch to';

  if (targetBusiness && targetPeriod === 'year') {
    return `${verb} Business annual`;
  }
  if (targetBusiness && targetPeriod === 'month') {
    return `${verb} Business monthly`;
  }
  if (targetBusiness && targetPeriod === '2year') {
    return `${verb} Business 2-year`;
  }
  if (targetPeriod === '2year') return `${verb} 2-year`;
  if (targetPeriod === 'year') return `${verb} 1-year`;
  return `${verb} monthly`;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthlyEquivalent(plan: ApiPlan) {
  return plan.price / getApiPlanPaidMonths(plan);
}

function CurrentPlanTab() {
  const { subscription, user, loading, hasSessionToken } = useAuth();
  const navigate = useNavigate();
  const {
    openBillingPortal,
    portalLoading,
    cancelling,
    cancelSubscriptionAtPeriodEnd,
    upgradeToBusinessPlan,
    businessUpgradeLoading,
  } = useSubscriptionBillingActions();
  const sessionToken = hasSessionToken ? getSessionToken() : null;

  if (loading) {
    return <Skeleton className="h-56 w-full rounded-[15px]" />;
  }

  if (!subscription || !hasManageableSubscription(subscription)) {
    return (
      <div className="rounded-[15px] border border-[#e3e8f0] bg-white p-8 text-center shadow-[0px_3px_4px_rgba(15,32,64,0.03)]">
        <p className="text-[16px] font-semibold text-[#0f2040]">
          No active subscription
        </p>
        <p className="mt-2 text-[14px] text-[#627086]">
          Choose a plan to protect your devices and unlock all KeenVPN features.
        </p>
        <button
          type="button"
          onClick={() => navigate('/subscription?tab=plans')}
          className="mt-5 rounded-[8px] bg-[#0f2040] px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          View plans
        </button>
      </div>
    );
  }

  const status = (subscription.status || '').toLowerCase();
  const statusLabel =
    status === 'trialing'
      ? 'Trialing'
      : status === 'past_due'
        ? 'Past due'
        : 'Active';
  const statusClass =
    status === 'past_due'
      ? 'bg-[#fff4eb] text-[#c05600]'
      : 'bg-[#e6f9f0] text-[#159653]';

  const isBusiness =
    resolveMembershipPlanTier(subscription) === 'business' ||
    (subscription.seatLimit != null && subscription.seatLimit > 1);

  const billingPeriod = resolveSubscriptionBillingPeriod(subscription);
  const periodLabel =
    billingPeriod === '2year'
      ? '2-year'
      : billingPeriod === 'year'
        ? 'Annual'
        : 'Monthly';

  const tierLabel = isBusiness ? 'Business' : 'Individual';
  const autoRenewOn = !subscription.cancelAtPeriodEnd;
  const canOpenStripePortal =
    isStripeSubscription(subscription) && subscription.canManageBilling;
  const canCancel =
    isStripeSubscription(subscription) &&
    subscription.canManageBilling === true &&
    !subscription.cancelAtPeriodEnd;

  return (
    <>
    <section className="overflow-hidden rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_12px_30px_rgba(15,32,64,0.06)]">
      <div className="flex min-h-[96px] items-center justify-between border-b border-[#e3e8f0] px-6 py-5 md:px-9">
        <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0f2040]">
          Current plan
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${statusClass}`}
        >
          <Check className="h-4 w-4" />
          {statusLabel}
        </span>
      </div>

      <div className="px-6 py-6 md:px-9 md:py-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e3e8f0] pb-5">
          <p className="text-[21px] font-bold tracking-[-0.5px] text-[#071f3f] md:text-[24px]">
            KeenVPN - {tierLabel}{' '}
            <span className="text-[#ff7900]">{periodLabel}</span>
          </p>
        </div>

        {status === 'past_due' ? (
          <div className="mt-5 rounded-[10px] border border-[#f0c2c2] bg-[#fff5f5] px-4 py-3 text-[14px] text-[#d14343]">
            Payment failed. Update your payment method to keep your VPN access.
          </div>
        ) : null}

        <div className="grid gap-y-7 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#e3e8f0] lg:py-7">
          <div className="flex gap-4 lg:px-8 lg:first:pl-8">
            <Calendar className="mt-0.5 h-6 w-6 shrink-0 text-[#ff7900]" />
            <div>
              <p className="text-[16px] text-[#627086]">
                {subscription.cancelAtPeriodEnd
                  ? 'Ends on'
                  : 'Next billing date'}
              </p>
              <p className="mt-2 text-[17px] font-bold text-[#0f2040]">
                {formatDate(
                  subscription.endDate || subscription.currentPeriodEnd,
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-4 lg:px-8">
            <RefreshCw className="mt-0.5 h-6 w-6 shrink-0 text-[#ff7900]" />
            <div className="flex-1">
              <p className="text-[16px] text-[#627086]">Auto-renew</p>
              <p
                className={
                  autoRenewOn
                    ? 'mt-2 text-[17px] font-bold text-[#159653]'
                    : 'mt-2 text-[17px] font-bold text-[#627086]'
                }
              >
                {autoRenewOn ? 'On' : 'Off'}
              </p>
              {canCancel ? (
                <p className="mt-1 text-[13px] text-[#627086]">
                  Use Turn off auto-renewal below to stop future charges.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-4 lg:px-8">
            <CreditCard className="mt-0.5 h-6 w-6 shrink-0 text-[#ff7900]" />
            <div>
              <p className="text-[16px] text-[#627086]">Payment method</p>
              <p className="mt-2 text-[17px] font-bold text-[#0f2040]">
                {subscription.subscriptionType === 'apple_iap'
                  ? 'App Store billing'
                  : 'Stripe billing'}
              </p>
              {user?.email ? (
                <p className="mt-1 text-[14px] text-[#627086]">{user.email}</p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-4 lg:px-8 lg:pr-0">
            <Laptop className="mt-0.5 h-6 w-6 shrink-0 text-[#ff7900]" />
            <div>
              <p className="text-[16px] text-[#627086]">Devices</p>
              <p className="mt-2 text-[17px] font-bold text-[#0f2040]">
                {subscription.seatLimit
                  ? `Up to ${subscription.seatLimit * 5} devices`
                  : 'Up to 10 devices'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 border-t border-[#e3e8f0] pt-7">
          <button
            type="button"
            onClick={() => navigate('/subscription?tab=plans')}
            className="rounded-[9px] bg-[#0f2040] px-7 py-3.5 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Manage plan
          </button>
          {canOpenStripePortal ? (
            <button
              type="button"
              onClick={() => void openBillingPortal()}
              disabled={portalLoading}
              className="rounded-[9px] border border-[#cfd9e8] bg-white px-7 py-3.5 text-[16px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f7f9fc]"
            >
              {portalLoading ? (
                <Loader2 className="inline h-4 w-4 animate-spin" />
              ) : (
                'Change payment method'
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-6 border-t border-[#e3e8f0] pt-6">
          <SubscriptionCancellationControls
            subscription={subscription}
            cancelling={cancelling}
            onCancel={() => void cancelSubscriptionAtPeriodEnd()}
            onManageBilling={() => void openBillingPortal()}
            portalLoading={portalLoading}
            showManageBilling={false}
          />
        </div>
      </div>
    </section>

    {subscription ? (
      <div className="mt-5">
        <MembershipPlanUpgradeCard
          subscription={subscription}
          sessionToken={sessionToken}
          upgrading={businessUpgradeLoading}
          onUpgradePlan={upgradeToBusinessPlan}
          variant="dashboard"
        />
      </div>
    ) : null}
    </>
  );
}

function PlansTab() {
  const [tier, setTier] = useState<PlanTier>('premium');
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [plansReloadKey, setPlansReloadKey] = useState(0);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(
    null,
  );
  const { toast } = useToast();
  const { logout, subscription } = useAuth();
  const navigate = useNavigate();
  const {
    openBillingPortal,
    openPlanChangePortal,
    portalLoading,
    upgradeToBusinessPlan,
    businessUpgradeLoading,
  } = useSubscriptionBillingActions();
  const { dashboard: membershipDashboard, loading: membershipLoading } =
    useMembershipSharingContext();
  const isManageable = hasManageableSubscription(subscription);
  const canOpenStripePortal =
    isStripeSubscription(subscription) && Boolean(subscription?.canManageBilling);
  const membershipBlocksBusinessUpgrade =
    membershipLoading ||
    membershipDashboard?.role === 'transfer_pending' ||
    Boolean(membershipDashboard?.pendingTransfer);
  const canFreeBusinessUpgrade =
    Boolean(subscription) &&
    canUpgradeToBusinessPlan(subscription) &&
    !membershipBlocksBusinessUpgrade;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlansError(null);
    void fetchSubscriptionPlans().then((res) => {
      if (cancelled) return;
      if (res.success && res.plans) {
        setPlans(res.plans);
        setPlansError(null);
      } else {
        setPlans([]);
        setPlansError(
          res.error?.trim() || 'Unable to load plans. Please try again.',
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [plansReloadKey]);

  const loadPlans = useCallback(() => {
    setPlansReloadKey((key) => key + 1);
  }, []);

  const tierPlans = useMemo(() => {
    const filtered = plans.filter((p) => getPlanTier(p) === tier);
    // Individual: Monthly, 2-year, 1-year. Business: Monthly, Annual.
    return [...filtered].sort((a, b) => {
      const rank = (p: ApiPlan) =>
        isTwoYearApiPlan(p) ? 1 : isAnnualPlan(p) ? 2 : 0;
      return rank(a) - rank(b);
    });
  }, [plans, tier]);
  const monthlyPlan = tierPlans.find(
    (plan) => !isAnnualPlan(plan) && !isTwoYearApiPlan(plan),
  );

  const startCheckout = async (plan: ApiPlan) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe.',
        variant: 'destructive',
      });
      navigate('/signin');
      return;
    }

    try {
      setCheckoutLoadingId(plan.id);
      const aswebSuffix =
        sessionStorage.getItem('asweb_session') === '1' ? '&asweb=1' : '';
      const isBusiness = getPlanTier(plan) === 'team';
      const successUrl = isBusiness
        ? `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}&tab=team&business=upgraded${aswebSuffix}`
        : `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}${aswebSuffix}`;
      const cancelUrl = `${window.location.origin}/subscription?tab=plans`;

      const result = await createCheckoutSession(
        sessionToken,
        plan.id,
        successUrl,
        cancelUrl,
        isBusiness ? 1 : undefined,
      );

      if (!result.success) {
        if (result.errorCode === CHECKOUT_ERROR_SESSION_EXPIRED) {
          await logout();
          navigate('/signin');
          return;
        }
        throw new Error(result.error || 'Checkout failed');
      }
      if (result.url) window.location.href = result.url;
    } catch (error) {
      toast({
        title: 'Checkout failed',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      setCheckoutLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-10 w-56 rounded-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-96 rounded-[15px]" />
          <Skeleton className="h-96 rounded-[15px]" />
          <Skeleton className="h-96 rounded-[15px]" />
        </div>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="rounded-[15px] border border-[#f0c2c2] bg-[#fff5f5] px-6 py-8 text-center">
        <p className="text-[15px] font-semibold text-[#d14343]">{plansError}</p>
        <button
          type="button"
          className="mt-4 rounded-[8px] bg-[#0f2040] px-4 py-2 text-[13px] font-semibold text-white"
          onClick={() => void loadPlans()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-center sm:mb-12">
        <div className="inline-flex w-full max-w-[380px] rounded-[21px] border border-[#0f2040] bg-white p-1.5 sm:min-w-[380px] sm:w-auto">
          {(
            [
              { id: 'premium', label: 'Individual' },
              { id: 'team', label: 'Business' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTier(option.id)}
              className={[
                'flex-1 rounded-[16px] px-4 py-2 text-[15px] font-medium transition-colors sm:px-8 sm:text-[17px]',
                tier === option.id
                  ? 'bg-[#f8f1e9] font-semibold text-[#0f2040]'
                  : 'text-[#0f2040] hover:bg-[#f8fafc]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={[
          'grid gap-6',
          tierPlans.length >= 3
            ? 'md:grid-cols-3'
            : tierPlans.length === 2
              ? 'mx-auto max-w-[904px] md:grid-cols-2'
              : 'mx-auto max-w-md',
        ].join(' ')}
      >
        {tierPlans.map((plan) => {
          const twoYear = isTwoYearApiPlan(plan);
          const annual = isAnnualPlan(plan);
          const isBusiness = tier === 'team';
          // Featured: Individual 2-year, or Business annual
          const featured = twoYear || (isBusiness && annual);
          const monthly = monthlyEquivalent(plan);
          const coveredMonths = getApiPlanPaidMonths(plan);
          const standardTermPrice = monthlyPlan
            ? monthlyPlan.price * coveredMonths
            : null;
          const savingsPercent =
            standardTermPrice && standardTermPrice > plan.price
              ? Math.round(
                  ((standardTermPrice - plan.price) / standardTermPrice) * 100,
                )
              : null;
          const planFeatures = isBusiness
            ? [
                '5 connected devices per seat',
                ...FEATURES.slice(1),
                'Invite by email, separate logins',
                'Owner manages seats and members',
              ]
            : FEATURES;

          let title = 'Monthly plan';
          let subtitle = 'Maximum flexibility, no long-term commitment.';
          let cta = 'Choose monthly';
          let footer = 'Secure checkout. No hidden fees.';

          if (twoYear) {
            title = '2-year plan';
            subtitle = 'Best value. Lock in the lowest monthly price.';
            cta = 'Get the 2-year plan';
            footer = 'Best savings with full KeenVPN protection.';
          } else if (annual && isBusiness) {
            title = 'Annual plan';
            subtitle = 'Best value. Lock in the lowest monthly price.';
            cta = 'Get the 1-year plan';
            footer = 'Best savings with full KeenVPN protection.';
          } else if (annual) {
            title = '1-year plan';
            subtitle = 'A lower monthly rate, billed once a year.';
            cta = 'Choose 1-year';
            footer = 'Protected by our 30-day guarantee.';
          }

          const isCurrentPlan = isCurrentCatalogPlan(plan, subscription);

          if (isManageable && !isCurrentPlan && subscription) {
            if (isBusiness && canFreeBusinessUpgrade) {
              cta = isAppleIapSubscription(subscription)
                ? 'Set up future Business billing'
                : 'Enable Business for free';
            } else {
              cta = planChangeCtaLabel(plan, subscription);
            }
          }

          return (
            <div
              key={plan.id}
              className={[
                'relative flex min-h-0 flex-col rounded-[15px] border border-[#dce4f0] bg-white p-5 shadow-[0px_12px_28px_rgba(15,32,64,0.07)] sm:p-6 md:min-h-[820px]',
                featured ? 'md:-mt-1 md:mb-[-4px]' : '',
              ].join(' ')}
            >
              {featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ed7d36] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Best value
                </span>
              ) : null}

              {savingsPercent ? (
                <span
                  className={[
                    'absolute right-4 top-4 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    featured
                      ? 'bg-[#fff4eb] text-[#ed7d36]'
                      : 'bg-[#e6f9f0] text-[#1a9e5a]',
                  ].join(' ')}
                >
                  SAVE {savingsPercent}%
                </span>
              ) : null}

              <h3 className="text-[19px] font-bold text-[#071f3f]">{title}</h3>
              <p className="mt-2 min-h-[42px] text-[16px] leading-6 text-[#627086]">
                {subtitle}
              </p>

              <p className="mt-6 text-[40px] font-bold leading-none tracking-[-1px] text-[#071f3f]">
                <span className="mr-1 text-[22px] align-middle">$</span>
                {monthly.toFixed(2)}{' '}
                <span className="text-[16px] font-medium tracking-normal text-[#8d9ab1]">
                  / month
                </span>
              </p>
              <p className="mt-4 min-h-[21px] text-[14px] text-[#8d9ab1]">
                {twoYear ? (
                  <>
                    {standardTermPrice ? (
                      <span className="line-through opacity-60">
                        ${standardTermPrice.toFixed(2)}
                      </span>
                    ) : null}{' '}
                    ${plan.price.toFixed(2)} billed every 2 years.
                  </>
                ) : annual ? (
                  <>
                    ${plan.price.toFixed(2)} billed once per year.
                    {standardTermPrice && standardTermPrice > plan.price
                      ? ` Save $${(standardTermPrice - plan.price).toFixed(2)} annually.`
                      : ''}
                  </>
                ) : (
                  `Billed monthly at $${plan.price.toFixed(2)}. Cancel anytime.`
                )}
                {plan.isPerSeat ? ' Per seat.' : ''}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (isCurrentPlan) {
                    if (canOpenStripePortal) {
                      void openBillingPortal();
                      return;
                    }
                    toast({
                      title: 'Already subscribed',
                      description:
                        subscription?.subscriptionType === 'apple_iap'
                          ? 'Manage or change your plan in the App Store.'
                          : 'Open billing to change your plan.',
                    });
                    navigate('/subscription');
                    return;
                  }
                  // Match Account/Pricing: eligible Individual → Business is a
                  // $0 in-place upgrade (or Apple checkout handoff), not portal.
                  if (
                    isBusiness &&
                    canFreeBusinessUpgrade &&
                    subscription
                  ) {
                    void upgradeToBusinessPlan(plan.id, 1);
                    return;
                  }
                  if (isManageable && canOpenStripePortal) {
                    void openPlanChangePortal();
                    return;
                  }
                  if (isManageable) {
                    toast({
                      title: 'Change plan',
                      description:
                        subscription?.subscriptionType === 'apple_iap'
                          ? 'Manage or change your plan in the App Store.'
                          : 'Open billing to change your plan.',
                    });
                    navigate('/subscription');
                    return;
                  }
                  void startCheckout(plan);
                }}
                disabled={
                  checkoutLoadingId === plan.id ||
                  businessUpgradeLoading ||
                  (isCurrentPlan && canOpenStripePortal && portalLoading) ||
                  (!isCurrentPlan &&
                    isManageable &&
                    canOpenStripePortal &&
                    !canFreeBusinessUpgrade &&
                    portalLoading)
                }
                className={[
                  'mt-4 w-full rounded-[8px] py-3 text-[17px] font-semibold transition-opacity',
                  featured
                    ? 'bg-[#ed7d36] text-white hover:opacity-90'
                    : 'border border-[#dbe2ec] bg-white text-[#0f2040] hover:bg-[#f5f7fb]',
                ].join(' ')}
              >
                {checkoutLoadingId === plan.id ||
                businessUpgradeLoading ||
                ((isCurrentPlan ||
                  (isManageable &&
                    !isCurrentPlan &&
                    !(isBusiness && canFreeBusinessUpgrade))) &&
                  canOpenStripePortal &&
                  portalLoading) ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : isCurrentPlan ? (
                  canOpenStripePortal ? 'Manage billing' : 'Current plan'
                ) : (
                  cta
                )}
              </button>

              <p className="mt-8 text-[15px] font-bold uppercase tracking-[0.8px] text-[#8d9ab1]">
                Everything included
              </p>
              <ul className="mt-4 flex-1 space-y-3">
                {planFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-[16px] leading-5 text-[#52627e]"
                  >
                    <CircleCheck
                      className={[
                        'mt-0.5 h-5 w-5 shrink-0',
                        featured ? 'text-[#ff7900]' : 'text-[#0f2040]',
                      ].join(' ')}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex items-center gap-2 border-t border-[#e3e8f0] pt-5 text-[14px] text-[#8d9ab1]">
                <Shield className="h-5 w-5" />
                {footer}
              </p>
            </div>
          );
        })}
      </div>

      {tierPlans.length === 0 ? (
        <p className="mt-6 text-center text-[14px] text-[#627086]">
          No plans available for this tier right now.
        </p>
      ) : null}
    </div>
  );
}

function isPaymentReceiptEvent(event: SubscriptionEvent) {
  return event.eventType === 'purchase' || event.eventType === 'renewal';
}

function InvoiceModal({
  event,
  onClose,
}: {
  event: SubscriptionEvent;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const amount =
    typeof event.amount === 'number'
      ? formatCurrency(event.amount, event.currency || 'USD')
      : '—';
  const paidOn = formatEventDate(event.eventDate).date;
  const period =
    event.periodStart && event.periodEnd
      ? `${formatEventDate(event.periodStart).date} – ${formatEventDate(event.periodEnd).date}`
      : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const content = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-2 px-5 pt-5 text-[14px] text-[#627086] hover:text-[#0f2040] sm:px-9 sm:pt-7 sm:text-[15px]"
      >
        <X className="h-5 w-5" />
        Close invoice and payment details
      </button>

      <h2 className="break-words px-5 pb-6 pt-4 text-[24px] font-bold leading-tight tracking-[-0.5px] text-[#252525] sm:px-9 sm:pb-8 sm:pt-6 sm:text-[34px] sm:tracking-[-0.8px] md:text-[42px]">
        Paid on {paidOn}
      </h2>

      <div className="border-y border-[#e3e8f0] px-5 py-5 sm:px-9">
        <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-[#737373]">
          Summary
        </p>
        <div className="mt-5 grid grid-cols-[72px_1fr] gap-y-2 text-[15px] sm:grid-cols-[88px_1fr] sm:text-[16px]">
          <span className="text-[#737373]">To</span>
          <span className="min-w-0 break-words font-medium text-[#303030]">
            {user?.displayName || user?.email || '—'}
          </span>
          <span className="text-[#737373]">From</span>
          <span className="font-medium text-[#303030]">KeenVPN</span>
          <span className="text-[#737373]">Invoice</span>
          <span className="min-w-0 break-all font-medium text-[#303030]">
            #{event.id.slice(0, 12).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-9">
        <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-[#737373]">
          Items
        </p>
        {period ? (
          <p className="mt-4 text-[13px] font-semibold uppercase text-[#737373] sm:text-[14px]">
            {period}
          </p>
        ) : null}
        <div className="mt-3 flex items-start justify-between gap-3 border-b border-[#e3e8f0] pb-5 text-[15px] sm:text-[16px]">
          <div className="min-w-0">
            <p className="font-medium text-[#303030]">{event.planName}</p>
            <p className="mt-1 text-[#737373]">Qty 1</p>
          </div>
          <p className="shrink-0 font-medium text-[#303030]">{amount}</p>
        </div>

        <div className="mt-4 space-y-3 text-[15px] sm:text-[16px]">
          <div className="flex justify-between gap-3">
            <span className="text-[#454545]">Total excluding tax</span>
            <span className="shrink-0 text-[#454545]">{amount}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-[#e3e8f0] pt-4">
            <span className="font-semibold text-[#303030]">Total due</span>
            <span className="shrink-0 font-semibold text-[#303030]">{amount}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#454545]">Amount paid</span>
            <span className="shrink-0 text-[#454545]">{amount}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#454545]">Amount remaining</span>
            <span className="shrink-0 text-[#454545]">
              {formatCurrency(0, event.currency || 'USD')}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e3e8f0] px-5 py-6 sm:px-9">
        <p className="text-[18px] font-medium text-[#303030]">Payment history</p>
        <div className="mt-5 flex items-center justify-between gap-3 text-[14px] sm:text-[15px]">
          <div className="min-w-0">
            <p className="font-medium text-[#303030]">{amount}</p>
            <p className="mt-1 text-[#737373]">
              {event.provider === 'apple_iap' ? 'App Store' : 'Stripe'}
            </p>
          </div>
          <p className="shrink-0 text-[#737373]">{paidOn}</p>
        </div>
      </div>

      <p className="border-t border-[#e3e8f0] px-5 py-6 text-[14px] text-[#627086] sm:px-9 sm:text-[15px]">
        Questions? Contact{' '}
        <a
          href="mailto:support@vpnkeen.com"
          className="font-semibold text-[#3b6ae8] hover:underline"
        >
          support@vpnkeen.com
        </a>
      </p>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close invoice"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Absolute bottom sheet on mobile so content can scroll inside max height */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 z-10 flex max-h-[90dvh] w-full flex-col rounded-t-[16px] bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(92vh,900px)] sm:w-full sm:max-w-[606px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {content}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BillingHistoryTab() {
  const { events, loading, error, refetch, loadMore, pagination } =
    useSubscriptionHistory({ limit: 25 });
  const [selectedInvoice, setSelectedInvoice] =
    useState<SubscriptionEvent | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<SubscriptionEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (loading && events.length === 0) {
    return <Skeleton className="h-64 w-full rounded-[15px]" />;
  }

  if (error && events.length === 0) {
    return (
      <div className="rounded-[15px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error}</p>
        <button
          type="button"
          className="mt-3 font-semibold text-[#0f2040] underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const openEvent = (event: SubscriptionEvent) => {
    if (isPaymentReceiptEvent(event)) {
      setSelectedInvoice(event);
      return;
    }
    setSelectedDetail(event);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-[15px] border border-[#e3e8f0] bg-white shadow-[0px_12px_30px_rgba(15,32,64,0.06)]">
        <table className="w-full min-w-[720px] text-left text-[16px]">
          <thead>
            <tr className="border-b border-[#e3e8f0] text-[#586989]">
              <th className="px-11 py-6 font-semibold">Date</th>
              <th className="px-6 py-6 font-semibold">Plan</th>
              <th className="px-6 py-6 font-semibold">Provider</th>
              <th className="px-6 py-6 font-semibold">Status</th>
              <th className="px-6 py-6 font-semibold">Amount</th>
              <th className="w-12 px-3 py-6">
                <span className="sr-only">View details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-[#627086]"
                >
                  No billing history yet.
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const status = getStatusInfo(event.status, 'dashboard');
                const isReceipt = isPaymentReceiptEvent(event);
                return (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-b border-[#eef2f7] last:border-0 hover:bg-[#fafbfd]"
                    onClick={() => openEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEvent(event);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={
                      isReceipt
                        ? `View invoice for ${event.planName}`
                        : `View details for ${event.planName}`
                    }
                  >
                    <td className="px-11 py-6 text-[#24395f]">
                      {formatEventDate(event.eventDate).date}
                    </td>
                    <td className="px-6 py-6 font-medium text-[#24395f]">
                      {event.planName}
                    </td>
                    <td className="px-6 py-6 capitalize text-[#24395f]">
                      {event.provider === 'apple_iap' ? 'App Store' : 'Stripe'}
                    </td>
                    <td className="px-6 py-6">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          event.eventType === 'cancellation'
                            ? 'bg-[#f0f3f8] text-[#627086]'
                            : status.className
                        }`}
                      >
                        {event.eventType === 'cancellation'
                          ? 'Cancelled'
                          : status.label}
                      </span>
                    </td>
                    <td className="px-6 py-6 font-medium text-[#24395f]">
                      {typeof event.amount === 'number'
                        ? formatCurrency(event.amount, event.currency || 'USD')
                        : '—'}
                    </td>
                    <td className="px-3 py-6 text-[#627086]">
                      <ChevronRight className="h-5 w-5" aria-hidden />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-[8px] border border-[#dbe2ec] bg-white px-4 py-2 text-[13px] font-semibold text-[#0f2040] hover:bg-[#f5f7fb]"
          >
            Load more
          </button>
        </div>
      ) : null}

      {selectedInvoice ? (
        <InvoiceModal
          event={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      ) : null}

      <SubscriptionEventDetail
        event={selectedDetail}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedDetail(null);
        }}
      />
    </>
  );
}

export default function DashboardSubscription() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasSessionToken } = useAuth();
  const sessionToken = hasSessionToken ? getSessionToken() : null;
  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'plans' || tabParam === 'billing' ? tabParam : 'subscription';

  const setTab = (id: TabId) => {
    setSearchParams(id === 'subscription' ? {} : { tab: id }, {
      replace: true,
    });
  };

  return (
    <MembershipSharingProvider sessionToken={sessionToken}>
    <div>
      <div className="border-b border-[#e3e8f0] px-4 pt-4 sm:px-6 sm:pt-5 md:px-10 md:pt-7 xl:px-12">
        <div className="-mx-4 flex gap-6 overflow-x-auto px-4 sm:mx-0 sm:gap-9 sm:overflow-visible sm:px-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={[
                'relative shrink-0 pb-4 text-[15px] font-medium transition-colors sm:text-[17px]',
                activeTab === tab.id
                  ? 'text-[#0f2040]'
                  : 'text-[#627086] hover:text-[#0f2040]',
              ].join(' ')}
            >
              {tab.label}
              {activeTab === tab.id ? (
                <span className="absolute inset-x-0 -bottom-px h-[4px] bg-[#ff7900]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-8 sm:px-6 sm:py-12 md:px-10 md:py-14 xl:px-12">
        <div className="mx-auto max-w-[1320px]">
          {activeTab === 'subscription' ? <CurrentPlanTab /> : null}
          {activeTab === 'plans' ? <PlansTab /> : null}
          {activeTab === 'billing' ? <BillingHistoryTab /> : null}
        </div>
      </div>
    </div>
    </MembershipSharingProvider>
  );
}
