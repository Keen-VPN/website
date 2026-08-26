import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10 text-[#0f2040]">
      <div className="w-full max-w-md rounded-[16px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_12px_30px_rgba(15,32,64,0.08)] sm:p-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-[#0f2040]">
          {title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#627086]">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait…
            </span>
          ) : (
            message
          )}
        </p>
        {!loading ? (
          <Link
            to="/dashboard"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-[#0f2040] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Go to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default ChangeAuthEmail;
