import { useAuth } from "@/contexts/AuthContext";
import { getSessionToken } from "@/auth/backend";
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
export default function DashboardAiAssistant() {
  const { hasSessionToken } = useAuth();
  const sessionToken = hasSessionToken ? getSessionToken() : null;

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
                  AI assistants
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

            <AiAssistantCard sessionToken={sessionToken} />
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
