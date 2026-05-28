import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, MailX } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmContextualEmailUnsubscribe } from "@/auth";

function isSameOriginRedirect(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

const ContextualEmailUnsubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = React.useState<
    "confirm" | "submitting" | "error"
  >("confirm");
  const [message, setMessage] = React.useState("");

  const handleConfirm = async () => {
    if (!token) {
      setStatus("error");
      setMessage("This unsubscribe link is missing or invalid.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const response = await confirmContextualEmailUnsubscribe(token);
    if (!response.success) {
      setStatus("error");
      setMessage(
        response.error ||
          "This unsubscribe link is invalid or has expired. You can manage email preferences from your account.",
      );
      return;
    }

    const redirectUrl =
      response.redirectUrl && isSameOriginRedirect(response.redirectUrl)
        ? response.redirectUrl
        : "/account?email_prefs=unsubscribed";

    window.location.href = redirectUrl;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Unsubscribe — KeenVPN"
        description="Confirm unsubscribe from personalized KeenVPN emails."
        canonical="https://vpnkeen.com/email/unsubscribe"
        noIndex
      />
      <Header />
      <main className="flex-1 py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="border-accent/50 shadow-glow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MailX className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                Unsubscribe from personalized emails?
              </CardTitle>
              <CardDescription>
                You will stop receiving personalized tips and offers based on
                your browsing while connected to KeenVPN. General product
                updates may still be sent separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!token || status === "error" ? (
                <p className="text-sm text-destructive text-center">
                  {message ||
                    "This unsubscribe link is missing or invalid. Manage preferences from your account instead."}
                </p>
              ) : null}

              {token && status !== "error" ? (
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={status === "submitting"}
                  onClick={() => void handleConfirm()}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unsubscribing...
                    </>
                  ) : (
                    "Confirm unsubscribe"
                  )}
                </Button>
              ) : null}

              <Button
                className="w-full"
                variant="outline"
                disabled={status === "submitting"}
                onClick={() => navigate("/account")}
              >
                Keep emails / go to account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContextualEmailUnsubscribe;
