import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BACKEND_URL } from "@/auth/backend";
import {
  clearReferralTokenStorage,
  setReferralTokenStorage,
} from "@/auth/referral-token";

const ReferralLanding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** `false` once we get a JSON body with valid === false */
  const [inviteInvalid, setInviteInvalid] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setReferrerName(null);
    setInviteInvalid(false);
    setReferralTokenStorage(token);

    let cancelled = false;
    void fetch(`${BACKEND_URL}/referral/resolve/${encodeURIComponent(token)}`)
      .then((res) => res.json().catch(() => ({})))
      .then((data: { valid?: boolean; referrerName?: string }) => {
        if (cancelled) return;
        if (data.valid === false) {
          clearReferralTokenStorage();
          setInviteInvalid(true);
        } else if (data.valid && data.referrerName) {
          setReferrerName(data.referrerName);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-gradient-hero py-20">
        <Card className="w-full max-w-lg border-accent/50 text-center shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl">
              {referrerName
                ? `${referrerName} invited you to KeenVPN`
                : "You've been invited to KeenVPN"}
            </CardTitle>
            <CardDescription className="text-base">
              Create an account with the same browser session to connect this
              invite. When you subscribe, your friend can earn 1 free month.
              {inviteInvalid ? (
                <>
                  {" "}
                  <span className="mt-2 block text-sm text-muted-foreground">
                    This invite link could not be validated. It may be invalid,
                    expired, or referrals may be unavailable.
                  </span>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate("/signin")}
            >
              Sign up or sign in
            </Button>
            <p className="text-sm text-muted-foreground">
              After you subscribe on a paid plan, rewards apply per program
              terms.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ReferralLanding;
