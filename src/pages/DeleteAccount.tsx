import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, Mail, Trash2, UserX } from "lucide-react";

const SUPPORT_EMAIL = "support@vpnkeen.com";

/**
 * Public account deletion page.
 *
 * Google Play requires a publicly reachable URL where users can request deletion of
 * their account and associated data, and it has to work for someone who no longer has
 * the app installed or can no longer sign in — hence the email route alongside the
 * self-serve one.
 */
const DeleteAccount = () => {
  const deleted = [
    "Your account and profile information",
    "All subscription records held by KeenVPN",
    "Your saved preferences and settings",
    "Your connection history and usage statistics",
    "Perks, referrals, and friends activity tied to your account",
  ];

  const retained = [
    {
      what: "Payment and invoice records",
      why: "Held by our payment providers (Google Play, Apple, Stripe) to meet legal, tax, and accounting obligations. Request removal directly from that provider.",
    },
    {
      what: "Anonymised, aggregated statistics",
      why: "Retained without anything that identifies you, so it cannot be traced back to your account.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Delete Your Account — KeenVPN"
        description="Request permanent deletion of your KeenVPN account and associated data, including what is removed and what is retained."
        canonical="https://vpnkeen.com/delete-account"
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-destructive/30 rounded-full px-4 py-2 mb-6 shadow-lg">
              <UserX className="h-4 w-4 text-destructive mr-2" />
              <span className="text-sm font-medium">Account deletion</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Delete your KeenVPN account
            </h1>
            <p className="text-lg text-muted-foreground">
              You can permanently delete your account and the data associated with
              it at any time. Here is exactly what happens, and two ways to request it.
            </p>
          </div>

          <section className="mb-10 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-destructive mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-destructive mb-1">
                  Cancel your subscription first
                </p>
                <p className="text-sm text-muted-foreground">
                  Deleting your KeenVPN account does not cancel a subscription billed
                  by Google Play or Apple — those are managed by the store, and you
                  will keep being charged until you cancel there. Cancel first, then
                  delete. Deletion cannot be undone and no refunds are issued.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Option 1 — Delete it yourself</h2>
            <p className="text-muted-foreground mb-4">
              The fastest route. Sign in, open your account page, and use{" "}
              <strong>Delete Account</strong> under “Danger zone”. Deletion happens
              immediately and we email you a confirmation.
            </p>
            <Button asChild variant="destructive">
              <Link to="/account">
                <Trash2 className="mr-2 h-4 w-4" />
                Go to my account
              </Link>
            </Button>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">
              Option 2 — Ask us to delete it
            </h2>
            <p className="text-muted-foreground mb-4">
              If you can no longer sign in, or no longer have the app installed, email
              us from the address on your account and we will delete it for you. We
              action these within 30 days and confirm by email when it is done.
            </p>
            <Button asChild variant="outline">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  "Account deletion request",
                )}&body=${encodeURIComponent(
                  "Please delete my KeenVPN account and associated data.\n\nAccount email: \n",
                )}`}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email {SUPPORT_EMAIL}
              </a>
            </Button>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">What gets deleted</h2>
            <ul className="space-y-2">
              {deleted.map((item) => (
                <li key={item} className="flex items-start text-muted-foreground">
                  <span className="text-destructive mr-3">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">What we keep, and why</h2>
            <div className="space-y-4">
              {retained.map((item) => (
                <div
                  key={item.what}
                  className="rounded-lg border border-border bg-card/50 p-4"
                >
                  <p className="font-medium mb-1">{item.what}</p>
                  <p className="text-sm text-muted-foreground">{item.why}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm text-muted-foreground">
              If you share your membership with others, deleting your account also
              ends their access. For more on how we handle your data, see our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DeleteAccount;
