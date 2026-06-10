import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  adminExportBroadcastAudienceCsv,
  adminFetchBroadcastAudience,
  adminSendBroadcastEmail,
  adminSendBroadcastPreview,
  type BroadcastEmailAudience,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const AUDIENCE_OPTIONS: { value: BroadcastEmailAudience; label: string }[] = [
  { value: "all_deliverable", label: "All deliverable users" },
  { value: "opted_in", label: "Opted in to tips & offers only" },
];

export default function AdminBroadcastEmail() {
  const { admin, can } = useAdminAuth();
  const { toast } = useToast();
  const canBroadcast = can("emails.broadcast");

  const [audience, setAudience] =
    useState<BroadcastEmailAudience>("all_deliverable");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [optedInCount, setOptedInCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [preheader, setPreheader] = useState("");
  const [ctaLabel, setCtaLabel] = useState("View perks");
  const [ctaUrl, setCtaUrl] = useState("https://vpnkeen.com/perks");
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const composePayload = useCallback(
    () => ({
      audience,
      subject: subject.trim(),
      headline: headline.trim(),
      body: body.trim(),
      preheader: preheader.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
    }),
    [audience, subject, headline, body, preheader, ctaLabel, ctaUrl],
  );

  const refreshAudience = useCallback(async () => {
    setLoadingAudience(true);
    const result = await adminFetchBroadcastAudience(audience);
    setLoadingAudience(false);
    if (!result.ok || !result.data) {
      toast({
        title: "Could not load audience",
        description: result.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }
    setRecipientCount(result.data.totalRecipients);
    setOptedInCount(result.data.optedInCount);
  }, [audience, toast]);

  useEffect(() => {
    if (!canBroadcast) return;
    void refreshAudience();
  }, [canBroadcast, refreshAudience]);

  const handleExport = async () => {
    setExporting(true);
    const result = await adminExportBroadcastAudienceCsv(audience);
    setExporting(false);
    if (!result.ok || !result.blob) {
      toast({
        title: "Export failed",
        description: result.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "broadcast-audience.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    const result = await adminSendBroadcastPreview(composePayload());
    setPreviewing(false);
    if (!result.ok) {
      toast({
        title: "Preview failed",
        description: result.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Preview sent",
      description: `Check ${admin?.email ?? "your inbox"}.`,
    });
  };

  const handleSend = async () => {
    if (recipientCount == null || recipientCount < 1) {
      toast({
        title: "No recipients",
        description: "Refresh the audience preview before sending.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Send this broadcast to ${recipientCount.toLocaleString()} users via Resend?`,
    );
    if (!confirmed) return;

    setSending(true);
    const result = await adminSendBroadcastEmail({
      ...composePayload(),
      confirmRecipientCount: recipientCount,
      sendImmediately: true,
    });
    setSending(false);

    if (!result.ok || !result.data) {
      toast({
        title: "Broadcast failed",
        description: result.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Broadcast queued in Resend",
      description: `Broadcast ${result.data.broadcastId} — ${result.data.syncedContactCount.toLocaleString()} contacts synced.`,
    });
  };

  if (!canBroadcast) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Broadcast Email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your admin account does not have permission to send broadcast emails.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Broadcast Email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compose a Resend broadcast for KeenVPN users. Default audience is all
          deliverable accounts.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Audience</h3>
        <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="audience">Recipient filter</Label>
            <Select
              value={audience}
              onValueChange={(value) =>
                setAudience(value as BroadcastEmailAudience)
              }
            >
              <SelectTrigger id="audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Recipients</p>
              <p className="text-2xl font-semibold tabular-nums">
                {loadingAudience
                  ? "…"
                  : recipientCount?.toLocaleString() ?? "—"}
              </p>
            </div>
            {audience === "all_deliverable" && optedInCount != null ? (
              <div className="rounded-lg border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Opted in</p>
                <p className="text-lg font-medium tabular-nums">
                  {optedInCount.toLocaleString()}
                </p>
              </div>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void refreshAudience()}
              disabled={loadingAudience}
            >
              Refresh count
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Message</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="New partner perk for KeenVPN members"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Exclusive cashback offer inside"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preheader">Preheader (optional)</Label>
            <Input
              id="preheader"
              value={preheader}
              onChange={(event) => setPreheader(event.target.value)}
              placeholder="Short inbox preview line"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              placeholder={
                "We partnered with a new cashback provider.\n\nView the full offer and claim steps on your perks page."
              }
            />
            <p className="text-xs text-muted-foreground">
              Separate paragraphs with a blank line.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ctaLabel">CTA label (optional)</Label>
              <Input
                id="ctaLabel"
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaUrl">CTA URL (optional)</Label>
              <Input
                id="ctaUrl"
                value={ctaUrl}
                onChange={(event) => setCtaUrl(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void handlePreview()}
          disabled={previewing || !subject || !headline || !body}
        >
          {previewing ? "Sending preview…" : "Send preview to me"}
        </Button>
        <Button
          onClick={() => void handleSend()}
          disabled={
            sending ||
            loadingAudience ||
            !subject ||
            !headline ||
            !body ||
            recipientCount == null
          }
        >
          {sending ? "Sending…" : "Send broadcast"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Requires `RESEND_BROADCAST_SEGMENT_ID` on the backend. Recipients are
        synced to that Resend segment before the broadcast is created. Resend
        adds per-recipient unsubscribe links automatically.
      </p>
    </div>
  );
}
