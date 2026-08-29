import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  fetchSplitTunnelingPreference,
  updateSplitTunnelingPreference,
} from "@/auth/backend";
import { Switch } from "@/components/ui/switch";
import {
  normalizeSplitTunnelingDomain,
  SPLIT_TUNNELING_MAX_DOMAINS,
} from "@/lib/split-tunneling-domain";
import { useToast } from "@/hooks/use-toast";

const cardClass =
  "rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-7";

const outlineBtn =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-[#0f2040]/25 bg-white px-4 text-[13px] font-semibold text-[#0f2040] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50";

const primaryBtn =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[#0f2040] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function WebsiteExclusionsCard({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyAction, setBusyAction] = useState<
    null | "toggle" | "add" | "remove"
  >(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);
  const editorReady = !loading && !loadFailed;
  const busy = busyAction !== null;

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    const result = await fetchSplitTunnelingPreference(sessionToken);
    if (requestId !== loadRequestRef.current) return;

    if (!result.ok || !result.data) {
      setError(result.error ?? "Could not load website exclusions.");
      setLoadFailed(true);
      setDomains([]);
      setLoading(false);
      return;
    }

    setEnabled(result.data.enabled);
    setDomains(result.data.domains);
    setLoadFailed(false);
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void load();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  const persist = async (
    nextDomains: string[],
    nextEnabled: boolean,
    action: "toggle" | "add" | "remove",
  ) => {
    if (!editorReady) return false;

    setBusyAction(action);
    setError(null);
    const result = await updateSplitTunnelingPreference(sessionToken, {
      domains: nextDomains,
      enabled: nextEnabled,
    });
    setBusyAction(null);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Could not save website exclusions.");
      toast({
        title: "Could not save",
        description: result.error ?? "Please try again.",
        variant: "destructive",
      });
      return false;
    }

    setEnabled(result.data.enabled);
    setDomains(result.data.domains);
    return true;
  };

  const handleToggle = async (checked: boolean) => {
    if (!editorReady) return;
    const previous = enabled;
    setEnabled(checked);
    const ok = await persist(domains, checked, "toggle");
    if (!ok) setEnabled(previous);
  };

  const handleAdd = async () => {
    if (!editorReady) return;
    const normalized = normalizeSplitTunnelingDomain(draft);
    if (!normalized) {
      setError("Enter a valid domain (e.g. bank.com).");
      return;
    }
    if (domains.includes(normalized)) {
      setError(`${normalized} is already on your list.`);
      return;
    }
    if (domains.length >= SPLIT_TUNNELING_MAX_DOMAINS) {
      setError(
        `You can exclude at most ${SPLIT_TUNNELING_MAX_DOMAINS} websites.`,
      );
      return;
    }

    const next = [...domains, normalized].sort((a, b) => a.localeCompare(b));
    const ok = await persist(next, enabled, "add");
    if (ok) {
      setDraft("");
      toast({
        title: "Website excluded",
        description: `${normalized} was added to your account list.`,
      });
    }
  };

  const handleRemove = async (domain: string) => {
    if (!editorReady) return;
    const next = domains.filter((d) => d !== domain);
    setRemovingDomain(domain);
    try {
      const ok = await persist(next, enabled, "remove");
      if (ok) {
        toast({
          title: "Exclusion removed",
          description: `${domain} will use KeenVPN again on supported clients.`,
        });
      }
    } finally {
      setRemovingDomain(null);
    }
  };

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-[-0.3px] text-[#0f2040]">
            Website exclusions
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#627086]">
            Choose websites that won&apos;t use KeenVPN. This list is saved to
            your account and syncs to clients that support website exclusions
            (for example the Chrome extension).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-[13px] font-semibold text-[#0f2040]">
              Website Split Tunneling
            </p>
            <p className="text-[12px] text-[#627086]" aria-live="polite">
              {!editorReady
                ? "Unavailable until the list loads"
                : busyAction === "toggle"
                  ? "Saving…"
                  : enabled
                    ? "Excluded sites bypass KeenVPN"
                    : "List saved — enforcement off"}
            </p>
          </div>
          {busyAction === "toggle" ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-[#627086]"
              aria-hidden
            />
          ) : null}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => void handleToggle(checked)}
            disabled={!editorReady || busy}
            aria-label="Website Split Tunneling"
            aria-busy={busyAction === "toggle"}
            className="h-[22px] w-[40px] shrink-0 border-0 data-[state=checked]:bg-[#159653] data-[state=unchecked]:bg-[#dbe2ec] [&>span]:h-[18px] [&>span]:w-[18px] [&>span]:bg-white [&>span]:shadow-none [&>span]:data-[state=checked]:translate-x-[18px] [&>span]:data-[state=unchecked]:translate-x-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-[13px] text-[#627086]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading exclusions…
        </div>
      ) : loadFailed ? (
        <div className="mt-6 rounded-[10px] border border-[#f0c2c2] bg-[#fff5f5] px-4 py-4">
          <p className="text-[13px] text-[#d14343]" role="alert">
            {error ?? "Could not load website exclusions."}
          </p>
          <p className="mt-1 text-[12px] text-[#627086]">
            Editing is disabled so we do not overwrite your saved list by
            mistake.
          </p>
          <button
            type="button"
            className={`${outlineBtn} mt-3`}
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <form
            className="mt-6 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAdd();
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. bank.com or https://www.example.com"
              aria-label="Website domain or URL"
              disabled={busy}
              className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dbe2ec] bg-white px-3 text-[14px] text-[#0f2040] outline-none transition-colors placeholder:text-[#a0aabb] focus:border-[#0f2040]/40"
            />
            <button
              type="submit"
              className={primaryBtn}
              disabled={busy || !draft.trim()}
            >
              {busyAction === "add" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add website
            </button>
          </form>

          {error ? (
            <p className="mt-3 text-[13px] text-[#d14343]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            {domains.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-[#e3e8f0] bg-[#fafbfd] px-4 py-5 text-[13px] text-[#627086]">
                No excluded websites yet. Add a domain to keep it off KeenVPN on
                supported clients.
              </p>
            ) : (
              <ul className="divide-y divide-[#eef2f7] overflow-hidden rounded-[10px] border border-[#e3e8f0]">
                {domains.map((domain) => (
                  <li
                    key={domain}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] font-medium text-[#0f2040]">
                        {domain}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#627086]">
                        {enabled
                          ? "Bypasses KeenVPN when connected"
                          : "Saved — Split Tunneling is off"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={outlineBtn}
                      disabled={busy}
                      onClick={() => void handleRemove(domain)}
                      aria-label={`Remove ${domain}`}
                    >
                      {busyAction === "remove" &&
                      removingDomain === domain ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-[#8a95a6]">
            Enter a domain or full URL — we normalize it (for example{" "}
            <span className="font-mono">https://www.bank.com/login</span> becomes{" "}
            <span className="font-mono">bank.com</span>, which also covers
            subdomains). Changes apply to your KeenVPN account, not only this
            browser.
          </p>
        </>
      )}
    </section>
  );
}
