import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BACKEND_URL, getSessionToken } from "@/auth/backend";
import { useAuth } from "@/contexts/AuthContext";

const cardClass =
  "rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-8";
const primaryBtn =
  "inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#0f2040] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0f2040]/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-[#dbe2ec] bg-white px-5 text-[14px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * OAuth consent for the MCP server (KVPN-506).
 *
 * The API validates the authorization request and redirects here, because this
 * is where a member is already signed in. Nothing is decided on this page: it
 * shows who is asking and what they would get, then posts the member's decision
 * back to the API, which mints the code and says where to send the browser.
 *
 * The parameters are passed straight through untouched — they are the API's to
 * validate, and it re-validates them on the consent call rather than trusting
 * anything that came back via the browser.
 */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const { hasSessionToken, user } = useAuth();
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = params.get("client_name") || "An AI assistant";
  const redirectUri = params.get("redirect_uri") ?? "";

  const redirectHost = useMemo(() => {
    try {
      return new URL(redirectUri).host;
    } catch {
      return null;
    }
  }, [redirectUri]);

  // Sign-in first, then come straight back to this same request.
  useEffect(() => {
    if (hasSessionToken) return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/signin?next=${encodeURIComponent(returnTo)}`);
  }, [hasSessionToken]);

  async function decide(approved: boolean) {
    setSubmitting(approved ? "approve" : "deny");
    setError(null);

    const body: Record<string, string> = { approved: String(approved) };
    for (const key of [
      "client_id",
      "redirect_uri",
      "response_type",
      "code_challenge",
      "code_challenge_method",
      "scope",
      "state",
      "resource",
    ]) {
      const value = params.get(key);
      if (value) body[key] = value;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/oauth/authorize/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getSessionToken() ?? ""}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data?.redirectTo) {
        setError(data?.error_description || "Could not complete the connection.");
        setSubmitting(null);
        return;
      }
      // Back to the assistant, carrying the code (or the denial).
      window.location.replace(data.redirectTo);
    } catch {
      setError("Could not reach KeenVPN. Please try again.");
      setSubmitting(null);
    }
  }

  if (!hasSessionToken) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10">
      <div className="w-full max-w-[520px]">
        <section className={cardClass}>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#0f2040]">
            Connect {clientName} to KeenVPN?
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#627086]">
            {clientName} is asking to read your KeenVPN recommendations
            {user?.email ? ` for ${user.email}` : ""}.
          </p>

          <div className="mt-5 rounded-[10px] border border-[#e3e8f0] bg-[#fbfcfe] p-4">
            <p className="text-[13px] font-semibold text-[#0f2040]">It will be able to</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-[#627086]">
              <li>• Read your perks, offers and referral opportunities</li>
              <li>• Read aggregated recommendations from people in your network</li>
            </ul>
            <p className="mt-4 text-[13px] font-semibold text-[#0f2040]">It will not be able to</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-[#627086]">
              <li>• See your browsing history, visited sites or location</li>
              <li>• Change anything in your account, or make a purchase</li>
            </ul>
          </div>

          {redirectHost ? (
            <p className="mt-4 text-[12px] text-[#8a95a6]">
              You will be returned to <span className="font-medium">{redirectHost}</span>.
            </p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[10px] border border-[#f0c2c2] bg-[#fff5f5] px-4 py-3 text-[13px] text-[#d14343]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              className={primaryBtn}
              disabled={submitting !== null}
              onClick={() => void decide(true)}
            >
              {submitting === "approve" ? "Connecting…" : "Approve"}
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={submitting !== null}
              onClick={() => void decide(false)}
            >
              Cancel
            </button>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-[#8a95a6]">
            You can disconnect this at any time from Products → AI Assistant.
          </p>
        </section>
      </div>
    </div>
  );
}
