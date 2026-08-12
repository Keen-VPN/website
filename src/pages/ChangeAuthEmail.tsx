import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  cancelAuthEmailChangeWithToken,
  confirmAuthEmailChange,
} from "@/auth";

const ChangeAuthEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const action = (searchParams.get("action") || "confirm").toLowerCase();
  const [loading, setLoading] = React.useState(true);
  const [ok, setOk] = React.useState(false);
  const [message, setMessage] = React.useState(
    action === "cancel"
      ? "Cancelling your email change..."
      : "Updating your login email...",
  );
  const handledTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const key = `${action}:${token}`;
    if (handledTokenRef.current === key) return;
    handledTokenRef.current = key;

    const run = async () => {
      if (!token) {
        setOk(false);
        setMessage("Missing token.");
        setLoading(false);
        return;
      }

      try {
        if (action === "cancel") {
          const result = await cancelAuthEmailChangeWithToken(token);
          const success = Boolean(result.success);
          setOk(success);
          setMessage(
            success
              ? result.message || "Pending email change cancelled."
              : result.error || result.message || "Cancellation failed.",
          );
          return;
        }

        const result = await confirmAuthEmailChange(token);
        const success = Boolean(result.success);
        setOk(success);
        if (success) {
          setMessage(
            result.message ||
              (result.email
                ? `Your login email is now ${result.email}.`
                : "Your login email was updated successfully."),
          );
        } else {
          setMessage(
            result.error || result.message || "Verification failed.",
          );
        }
      } catch (error) {
        setOk(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again or contact support.",
        );
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [action, token]);

  const title =
    action === "cancel"
      ? ok
        ? "Change cancelled"
        : "Cancel email change"
      : ok
        ? "Email updated"
        : "Verify login email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {loading ? "Please wait..." : message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && (
            <Button asChild className="w-full">
              <Link to="/account">Go to account</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangeAuthEmail;
