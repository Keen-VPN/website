import React from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  fetchEmailCategoryPreferencesByToken,
  fetchMyEmailCategoryPreferences,
  getSessionToken,
  requestEmailPreferencesLink,
  unsubscribeAllByToken,
  unsubscribeAllForCurrentUser,
  updateEmailCategoryPreferencesByToken,
  updateMyEmailCategoryPreferences,
  type EmailCategoryPreference,
  type EmailCategoryPreferencesResponse,
} from "@/auth";

type Mode = "token" | "session" | "identify";

const EmailPreferences = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token")?.trim() ?? "";
  const sessionToken = getSessionToken();
  const mode: Mode = token ? "token" : sessionToken ? "session" : "identify";

  const [loading, setLoading] = React.useState(mode !== "identify");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [preferences, setPreferences] = React.useState<
    EmailCategoryPreference[]
  >([]);
  const [unsubscribedFromAll, setUnsubscribedFromAll] = React.useState(false);
  const [identifyEmail, setIdentifyEmail] = React.useState("");
  const [linkSent, setLinkSent] = React.useState("");

  const applyResponse = React.useCallback(
    (response: EmailCategoryPreferencesResponse): boolean => {
      if (!response.success || !response.preferences) {
        setError(response.error || "We could not load your email preferences.");
        return false;
      }
      setError("");
      setEmail(response.email ?? "");
      setPreferences(response.preferences);
      setUnsubscribedFromAll(Boolean(response.unsubscribedFromAll));
      return true;
    },
    [],
  );

  React.useEffect(() => {
    if (mode === "identify") return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const response =
        mode === "token"
          ? await fetchEmailCategoryPreferencesByToken(token)
          : await fetchMyEmailCategoryPreferences(sessionToken as string);
      if (cancelled) return;
      applyResponse(response);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyResponse, mode, sessionToken, token]);

  const toggleCategory = (category: string, subscribed: boolean) => {
    setPreferences((current) =>
      current.map((row) =>
        row.category === category ? { ...row, subscribed } : row,
      ),
    );
    // Turning anything back on means the recipient is no longer opted out of
    // everything, matching what the backend will store.
    if (subscribed) setUnsubscribedFromAll(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = Object.fromEntries(
      preferences.map((row) => [row.category, row.subscribed]),
    );
    const response =
      mode === "token"
        ? await updateEmailCategoryPreferencesByToken(token, payload)
        : await updateMyEmailCategoryPreferences(
            sessionToken as string,
            payload,
          );
    setSaving(false);
    if (!applyResponse(response)) {
      toast({
        title: "Could not save preferences",
        description: response.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Preferences saved",
      description: "Your email preferences have been updated.",
    });
  };

  const handleUnsubscribeAll = async () => {
    setSaving(true);
    const response =
      mode === "token"
        ? await unsubscribeAllByToken(token)
        : await unsubscribeAllForCurrentUser(sessionToken as string);
    setSaving(false);
    if (!applyResponse(response)) {
      toast({
        title: "Could not unsubscribe",
        description: response.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Unsubscribed",
      description:
        "You will no longer receive optional KeenVPN marketing emails.",
    });
  };

  const handleRequestLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await requestEmailPreferencesLink(identifyEmail.trim());
    setSaving(false);
    if (!response.success) {
      setError(response.error || "We could not send a preference link.");
      return;
    }
    setError("");
    setLinkSent(
      response.message ||
        "If that address receives KeenVPN emails, a preference link is on its way.",
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Email preferences — KeenVPN"
        description="Choose which emails you receive from KeenVPN."
        canonical="https://vpnkeen.com/email/preferences"
        noIndex
      />
      <Header />
      <main className="flex-1 py-12 sm:py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-xl">
          <Card className="border-accent/50 shadow-glow">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Your email preferences</CardTitle>
              <CardDescription>
                {mode === "identify"
                  ? "Enter the address you receive KeenVPN emails on and we'll send you a preference link."
                  : "Choose which emails you'd like to receive from KeenVPN."}
                {email ? (
                  <span className="mt-1 block break-all font-medium text-foreground">
                    {email}
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading preferences...
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              {mode === "identify" ? (
                linkSent ? (
                  <p className="text-sm text-muted-foreground">{linkSent}</p>
                ) : (
                  <form className="space-y-3" onSubmit={handleRequestLink}>
                    <Input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={identifyEmail}
                      onChange={(event) => setIdentifyEmail(event.target.value)}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={saving || !identifyEmail.trim()}
                    >
                      {saving ? "Sending..." : "Email me a preference link"}
                    </Button>
                  </form>
                )
              ) : null}

              {!loading && mode !== "identify" && preferences.length > 0 ? (
                <>
                  {unsubscribedFromAll ? (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      You are currently unsubscribed from all optional emails.
                      Turn a category back on to start receiving it again.
                    </p>
                  ) : null}

                  <div className="space-y-4">
                    {preferences.map((row) => (
                      <div
                        key={row.category}
                        className="flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{row.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {row.description}
                          </p>
                        </div>
                        <Switch
                          checked={row.subscribed}
                          disabled={saving}
                          aria-label={row.label}
                          onCheckedChange={(checked) =>
                            toggleCategory(row.category, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button
                      className="w-full"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save preferences"
                      )}
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={saving || unsubscribedFromAll}
                      onClick={() => void handleUnsubscribeAll()}
                    >
                      Unsubscribe from all
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Account, billing and security emails are always sent and
                      are not affected by these settings.
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EmailPreferences;
