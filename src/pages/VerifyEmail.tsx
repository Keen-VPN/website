import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { confirmContactEmailVerification } from "@/auth";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = React.useState(true);
  const [ok, setOk] = React.useState(false);
  const [message, setMessage] = React.useState("Verifying your email...");
  const verifiedTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (verifiedTokenRef.current === token) return;
    verifiedTokenRef.current = token;

    const run = async () => {
      if (!token) {
        setOk(false);
        setMessage("Missing verification token.");
        setLoading(false);
        return;
      }
      const result = await confirmContactEmailVerification(token);
      const success = Boolean(result.success);
      setOk(success);
      if (success) {
        setMessage(result.message || "Your email has been verified successfully.");
      } else {
        setMessage(result.error || result.message || "Verification failed.");
      }
      setLoading(false);
    };
    void run();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{ok ? "Email verified" : "Email verification"}</CardTitle>
          <CardDescription>{loading ? "Please wait..." : message}</CardDescription>
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

export default VerifyEmail;
