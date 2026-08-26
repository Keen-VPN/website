import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken } from "@/auth/backend";
import {
  clearStripeCheckoutReturn,
  dismissStripePostCheckoutUi,
  markStripeAutoOpenDone,
  markStripeCheckoutReturn,
  returnToKeenVpnAppAfterPayment,
  shouldAutoOpenAppAfterStripeCheckout,
  shouldShowStripePostCheckoutUi,
} from "@/lib/keenvpn-deep-links";

function buildDashboardPathAfterStripeReturn(
  params: URLSearchParams,
  isASWeb: boolean,
): string {
  const next = new URLSearchParams(params);
  next.delete("session_id");
  if (isASWeb) {
    next.set("asweb", "1");
  }
  const search = next.toString();
  return search ? `/dashboard?${search}` : "/dashboard";
}

function stripSessionIdFromParams(
  current: URLSearchParams,
  isASWeb: boolean,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete("session_id");
  if (isASWeb) {
    next.set("asweb", "1");
  }
  return next;
}

/** Hydrate subscription after Stripe checkout and clean dashboard return URLs. */
export function useStripeCheckoutReturn(appStoreUrl?: string) {
  const { loading, user, hasSessionToken, refreshSubscription } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const stripeSessionId = searchParams.get("session_id");
  const hasStripeSessionId = Boolean(stripeSessionId);
  const isASWeb = useMemo(() => {
    if (typeof window === "undefined") return false;
    const detected =
      searchParams.get("asweb") === "1" ||
      sessionStorage.getItem("asweb_session") === "1";
    if (detected && searchParams.get("asweb") === "1") {
      sessionStorage.setItem("asweb_session", "1");
    }
    return detected;
  }, [searchParams]);

  const processedStripeSessionRef = useRef<string | null>(null);
  const inFlightHydrationRef = useRef<Promise<void> | null>(null);
  const [checkoutHydrating, setCheckoutHydrating] = useState(hasStripeSessionId);
  const [checkoutHydrated, setCheckoutHydrated] = useState(!hasStripeSessionId);
  const [showPostCheckoutUi, setShowPostCheckoutUi] = useState(() =>
    shouldShowStripePostCheckoutUi(),
  );

  useEffect(() => {
    if (!hasStripeSessionId) return;
    markStripeCheckoutReturn(stripeSessionId);
    setShowPostCheckoutUi(shouldShowStripePostCheckoutUi());
  }, [hasStripeSessionId, stripeSessionId]);

  useEffect(() => {
    if (loading) return;
    if (!user && !hasSessionToken) {
      clearStripeCheckoutReturn();
      setShowPostCheckoutUi(false);
    }
  }, [user, loading, hasSessionToken]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAfterCheckout = async () => {
      if (loading) return;

      if (
        stripeSessionId &&
        processedStripeSessionRef.current === stripeSessionId
      ) {
        if (!cancelled) {
          setCheckoutHydrating(false);
          setCheckoutHydrated(true);
          setSearchParams(
            (current) => stripSessionIdFromParams(current, isASWeb),
            { replace: true },
          );
        }
        return;
      }

      if (stripeSessionId && inFlightHydrationRef.current) {
        await inFlightHydrationRef.current;
        if (!cancelled) {
          setCheckoutHydrating(false);
          setCheckoutHydrated(true);
          setSearchParams(
            (current) => stripSessionIdFromParams(current, isASWeb),
            { replace: true },
          );
        }
        return;
      }

      if (!user || !hasSessionToken) {
        if (!cancelled) {
          setCheckoutHydrating(false);
          setCheckoutHydrated(true);
        }
        return;
      }

      if (!hasStripeSessionId || !stripeSessionId) {
        if (!cancelled) {
          setCheckoutHydrating(false);
          setCheckoutHydrated(true);
        }
        return;
      }

      if (!cancelled) {
        setCheckoutHydrating(true);
      }

      const runHydration = async () => {
        const attempts = 3;
        const timeoutMs = 4000;
        const runRefreshWithTimeout = async () => {
          await Promise.race([
            refreshSubscription(),
            new Promise<void>((resolve) => {
              window.setTimeout(resolve, timeoutMs);
            }),
          ]);
        };

        for (let attempt = 0; attempt < attempts; attempt += 1) {
          await runRefreshWithTimeout();
          if (attempt < attempts - 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 600));
          }
        }

        processedStripeSessionRef.current = stripeSessionId;
      };

      const hydrationPromise = runHydration().finally(() => {
        if (inFlightHydrationRef.current === hydrationPromise) {
          inFlightHydrationRef.current = null;
        }
      });
      inFlightHydrationRef.current = hydrationPromise;

      try {
        await hydrationPromise;
      } catch {
        /* refresh failures still clear the URL after attempts */
      }

      if (!cancelled) {
        setCheckoutHydrating(false);
        setCheckoutHydrated(true);
        setSearchParams(
          (current) => stripSessionIdFromParams(current, isASWeb),
          { replace: true },
        );
      }
    };

    void hydrateAfterCheckout();
    return () => {
      cancelled = true;
    };
  }, [
    hasSessionToken,
    hasStripeSessionId,
    isASWeb,
    loading,
    refreshSubscription,
    setSearchParams,
    stripeSessionId,
    user,
  ]);

  useEffect(() => {
    if (!showPostCheckoutUi || !isASWeb || !checkoutHydrated) return;
    if (!shouldAutoOpenAppAfterStripeCheckout()) return;

    const timer = window.setTimeout(() => {
      markStripeAutoOpenDone();
      returnToKeenVpnAppAfterPayment(getSessionToken(), appStoreUrl);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [appStoreUrl, checkoutHydrated, isASWeb, showPostCheckoutUi]);

  const dismissPostCheckoutUi = () => {
    dismissStripePostCheckoutUi();
    setShowPostCheckoutUi(false);
  };

  const returnToApp = (sessionToken: string | null) => {
    markStripeAutoOpenDone();
    returnToKeenVpnAppAfterPayment(sessionToken, appStoreUrl);
  };

  return {
    hasStripeSessionId,
    checkoutHydrating,
    checkoutHydrated,
    showPaymentCompleteBanner:
      Boolean(user) && hasSessionToken && showPostCheckoutUi,
    isASWeb,
    dismissPostCheckoutUi,
    returnToApp,
    dashboardPathAfterStripeReturn: buildDashboardPathAfterStripeReturn(
      searchParams,
      isASWeb,
    ),
  };
}
