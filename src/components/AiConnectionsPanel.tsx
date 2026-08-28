import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAiConnection,
  listAiConnections,
  revokeAiConnection,
  type AiConnection,
} from "@/auth/backend";

/**
 * Where a member connects an AI assistant to their KeenVPN account (KVPN-506).
 *
 * The assistant then asks KeenVPN for personalised recommendations and blends
 * them into its own answers. Each connection is a separate credential, so
 * revoking one assistant leaves the others — and the member's own sessions —
 * untouched.
 */
/**
 * The dashboard hardcodes a light palette (bg-white, #0f2040) while this component's shadcn
 * primitives resolve the app's dark theme tokens, so dropping it into Profile rendered a navy
 * input on a white card. `embedded` swaps in the dashboard's own classes and drops the internal
 * heading, which the page supplies via SectionHeader.
 */
const dashInput =
  "h-10 w-full rounded-[8px] border border-[#dbe2ec] bg-white px-3 text-[14px] text-[#0f2040] placeholder:text-[#97a3b6] focus:border-[#0f2040] focus:outline-none";
const dashPrimaryBtn =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-[#0f2040] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0f2040]/90 disabled:cursor-not-allowed disabled:opacity-50";
const dashGhostBtn =
  "inline-flex h-9 items-center rounded-[8px] px-3 text-[13px] font-semibold text-[#627086] transition-colors hover:bg-[#f5f7fb] hover:text-[#0f2040]";

export function AiConnectionsPanel({
  sessionToken,
  embedded = false,
}: {
  sessionToken: string;
  embedded?: boolean;
}) {
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState("");
  const [creating, setCreating] = useState(false);

  // Held until dismissed: the token is returned once and only its hash is
  // stored, so there is no endpoint that can show it again.
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAiConnections(sessionToken);
    if (result.ok) {
      setConnections(result.data ?? []);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load");
    }
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    if (!platform.trim()) return;
    setCreating(true);
    const result = await createAiConnection(sessionToken, platform.trim());
    setCreating(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to connect");
      return;
    }
    setPlatform("");
    setIssuedToken(result.token ?? null);
    setCopied(false);
    void load();
  }

  async function handleRevoke(connection: AiConnection) {
    if (
      !window.confirm(
        `Disconnect ${connection.platform}? It will lose access immediately.`,
      )
    ) {
      return;
    }
    const result = await revokeAiConnection(sessionToken, connection.id);
    if (result.ok) void load();
    else setError(result.error ?? "Failed to revoke");
  }

  return (
    <div className="flex flex-col gap-4">
      {!embedded && (
        <div>
          <h3 className="text-lg font-semibold">AI assistants</h3>
          <p className="text-sm text-muted-foreground">
            Connect an assistant so it can include your perks, referrals and
            trusted friend recommendations in its answers. It can read
            recommendations only — never your browsing, your location, or
            anything you have not chosen to share.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <Label
            htmlFor="ai-platform"
            className={embedded ? "text-[13px] font-medium text-[#627086]" : undefined}
          >
            Assistant
          </Label>
          {embedded ? (
            <input
              id="ai-platform"
              className={dashInput}
              placeholder="Claude, ChatGPT, Gemini…"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          ) : (
            <Input
              id="ai-platform"
              placeholder="Claude, ChatGPT, Gemini…"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          )}
        </div>
        {embedded ? (
          <button
            type="button"
            className={dashPrimaryBtn}
            disabled={creating || !platform.trim()}
            onClick={() => void handleConnect()}
          >
            {creating ? "Connecting…" : "Connect"}
          </button>
        ) : (
          <Button disabled={creating || !platform.trim()} onClick={() => void handleConnect()}>
            {creating ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>

      {loading ? (
        <p className={embedded ? "text-[13px] text-[#627086]" : "text-sm text-muted-foreground"}>Loading…</p>
      ) : connections.length === 0 ? (
        <p className={embedded ? "text-[13px] text-[#627086]" : "text-sm text-muted-foreground"}>
          No assistants connected yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className={
                embedded
                  ? "flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#e3e8f0] bg-[#fbfcfe] px-3 py-2"
                  : "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              }
            >
              <div className="min-w-0">
                <p className={embedded ? "text-[14px] font-semibold text-[#0f2040]" : "font-medium"}>
                  {c.platform}
                </p>
                <p className={embedded ? "text-[12px] text-[#627086]" : "text-xs text-muted-foreground"}>
                  {c.lastUsedAt
                    ? `Last used ${new Date(c.lastUsedAt).toLocaleDateString()}`
                    : "Never used"}
                  {c.expiresAt
                    ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              {embedded ? (
                <button
                  type="button"
                  className={dashGhostBtn}
                  onClick={() => void handleRevoke(c)}
                >
                  Disconnect
                </button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => void handleRevoke(c)}>
                  Disconnect
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={issuedToken !== null}
        onOpenChange={(open) => !open && setIssuedToken(null)}
      >
        {/*
          The dialog renders through a portal onto document.body, so it sits
          outside whatever scope the page put it in — including
          `.dashboard-surface`, which is what re-points the theme tokens at the
          dashboard's light palette. Without the class repeated here the tokens
          fall back to their `:root` values, which are dark: a navy panel with a
          title and an outline button that are dark-on-dark, and so invisible.
          Carried on the portalled element itself, which is the only place the
          scope can reach it. Omitted on /account, which is still dark.
        */}
        <DialogContent
          className={embedded ? "dashboard-surface sm:max-w-lg" : "sm:max-w-lg"}
        >
          <DialogHeader>
            <DialogTitle>Copy this key now</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              This key is shown once and cannot be recovered — we only store a
              hash of it. Paste it into your assistant now; if you lose it,
              disconnect and connect again.
            </div>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
              {issuedToken}
            </code>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (issuedToken) {
                  void navigator.clipboard.writeText(issuedToken);
                  setCopied(true);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => setIssuedToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
