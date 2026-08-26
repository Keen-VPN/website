import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL, getSessionToken } from "@/auth/backend";
import { AiConnectionsPanel } from "@/components/AiConnectionsPanel";
import { AiAssistantCard } from "@/components/AiAssistantCard";

const cardClass =
  "rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-7";

/**
 * Products → AI Assistant.
 *
 * These two cards used to live on the legacy /account page. The dashboard redesign orphaned
 * them: /account redirects to /dashboard, the sidebar has no Account entry, and no dashboard
 * page mounted AccountWorkspace. AiConnectionsPanel is the only UI for KVPN-506 — without it a
 * member cannot connect an AI assistant or revoke one.
 */

/**
 * The server URL a member pastes into their assistant.
 *
 * BACKEND_URL is relative ("/api") in most builds, but this value gets copied
 * into a different application entirely, so it has to be absolute.
 */
function mcpServerUrl(): string {
  const base = BACKEND_URL.startsWith("http")
    ? BACKEND_URL
    : `${window.location.origin}${BACKEND_URL}`;
  return `${base.replace(/\/+$/, "")}/mcp`;
}

export default function DashboardAiAssistant() {
  const { hasSessionToken } = useAuth();
  const sessionToken = hasSessionToken ? getSessionToken() : null;
  const [copied, setCopied] = useState(false);
  const serverUrl = mcpServerUrl();

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-[#0f2040]">
            AI Assistant
          </h1>
          <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-[#627086]">
            Connect KeenVPN to the AI assistant you already use, so its answers can
            include your perks, referrals and trusted friend recommendations.
          </p>
        </div>

        {sessionToken ? (
          <>
            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#0f2040]">
                  Connect your assistant
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
                  Add KeenVPN as a connector in Claude, ChatGPT or any assistant that
                  supports MCP. Paste this address — you will be asked to sign in and
                  approve, and nothing else is needed.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e3e8f0] bg-[#fbfcfe] px-3 py-2">
                <code className="min-w-0 flex-1 break-all text-[13px] text-[#0f2040]">
                  {serverUrl}
                </code>
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-[#dbe2ec] bg-white px-4 text-[13px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb]"
                  onClick={() => {
                    void navigator.clipboard.writeText(serverUrl);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <ol className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-[#627086]">
                <li>1. In Claude: Settings → Connectors → Add custom connector.</li>
                <li>2. Paste the address above. Leave the OAuth fields blank.</li>
                <li>3. Approve the KeenVPN screen that opens.</li>
              </ol>
            </section>

            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#0f2040]">
                  Connected assistants
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
                  Connect an assistant so it can include your perks, referrals and trusted
                  friend recommendations in its answers. It reads recommendations only — never
                  your browsing, your location, or anything you have not chosen to share.
                  Disconnect any time.
                </p>
              </div>
              <AiConnectionsPanel sessionToken={sessionToken} embedded />
            </section>

            {/* The card resolves theme tokens, which are dark at :root; this scope
                re-points them at the dashboard palette so it does not render a
                navy panel inside a white page. */}
            <div className="dashboard-surface">
              <AiAssistantCard sessionToken={sessionToken} />
            </div>
          </>
        ) : (
          <section className={cardClass}>
            <p className="text-[13px] text-[#627086]">
              Sign in to connect an AI assistant.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
