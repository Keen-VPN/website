import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAnnualUpgrade } from "@/hooks/use-annual-upgrade";

/**
 * One-click annual upgrade landing page.
 * After sign-in, automatically upgrades Stripe monthly subscribers with no extra clicks.
 */
const UpgradeAnnual = () => {
  const navigate = useNavigate();
  const { user, subscription, loading } = useAuth();
  const { upgrading, upgradeToAnnual } = useAnnualUpgrade();
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/signin?returnTo=/upgrade-annual", { replace: true });
      return;
    }

    const plan = (subscription?.plan ?? "").toLowerCase();
    if (plan.includes("annual") || plan.includes("yearly")) {
      navigate("/account", { replace: true });
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const result = await upgradeToAnnual("upgrade_annual_page");
      if (result.needsAuth) {
        navigate("/signin?returnTo=/upgrade-annual", { replace: true });
        return;
      }
      navigate("/account", { replace: true });
    })();
  }, [loading, user, subscription?.plan, navigate, upgradeToAnnual]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Upgrade to Annual — KeenVPN"
        description="Upgrade your KeenVPN monthly plan to annual and save."
        canonical="https://vpnkeen.com/upgrade-annual"
      />
      <Header />
      <main className="container mx-auto px-4 pt-32 pb-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Upgrading to annual billing
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {upgrading
            ? "We're switching your plan to annual. This only takes a moment."
            : "Preparing your upgrade..."}
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default UpgradeAnnual;
