import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { confirmContactEmailVerification } from "@/auth";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [ok, setOk] = React.useState(false);
  const [message, setMessage] = React.useState("Verifying your email...");

  React.useEffect(() => {
    const token = searchParams.get("token") || "";
    const run = async () => {
      if (!token) {
        setOk(false);
        setMessage("Missing verification token.");
        setLoading(false);
        return;
      }
      const result = await confirmContactEmailVerification(token);
      setOk(Boolean(result.success));
      setMessage(result.message || result.error || "Verification failed.");
      setLoading(false);
    };
    void run();
  }, [searchParams]);

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
