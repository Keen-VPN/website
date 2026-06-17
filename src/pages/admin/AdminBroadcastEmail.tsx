import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  adminPreviewAudienceTargeting,
  adminFetchBroadcastEmailJob,
  adminSendBroadcastEmail,
  adminSendBroadcastPreview,
  type AudienceTargeting,
  type AudienceTargetingPreview,
  type BroadcastEmailAudience,
} from "@/auth/backend";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  AudienceTargetingPanel,
} from "@/components/admin/AudienceTargetingPanel";
import {
  createDefaultAudienceTargeting,
  getAudienceTargetingValidationError,
} from "@/components/admin/audience-targeting.constants";

const AUDIENCE_OPTIONS: { value: BroadcastEmailAudience; label: string }[] = [
  { value: "all_deliverable", label: "All deliverable users" },
  { value: "opted_in", label: "Opted in to tips & offers only" },
];

const DEFAULT_CTA_LABEL = "View perks";
const DEFAULT_CTA_URL = "https://vpnkeen.com/perks";
const BROADCAST_JOB_POLL_INTERVAL_MS = 2000;
const BROADCAST_JOB_POLL_TIMEOUT_MS = 15 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AdminBroadcastEmail() {
  const { admin, can } = useAdminAuth();
  const { toast } = useToast();
  const canBroadcast = can("emails.broadcast");

  const [audience, setAudience] =
    useState<BroadcastEmailAudience>("all_deliverable");
  const [profileTargeting, setProfileTargeting] = useState<AudienceTargeting>(
    () => createDefaultAudienceTargeting(),
  );
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [totalAudience, setTotalAudience] = useState<number | null>(null);
  const [matchPercentage, setMatchPercentage] = useState<number | null>(null);
  const [optedInCount, setOptedInCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [preheader, setPreheader] = useState("");
  const [ctaLabel, setCtaLabel] = useState(DEFAULT_CTA_LABEL);
  const [ctaUrl, setCtaUrl] = useState(DEFAULT_CTA_URL);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const audienceRequestIdRef = useRef(0);
  const broadcastPollActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      broadcastPollActiveRef.current = false;
    };
  }, []);

  const composeReady = useMemo(
    () =>
      subject.trim().length > 0 &&
      headline.trim().length > 0 &&
      body.trim().length > 0,
    [subject, headline, body],
  );

  const resetComposeForm = useCallback(() => {
    setSubject("");
    setHeadline("");
    setBody("");
    setPreheader("");
    setCtaLabel(DEFAULT_CTA_LABEL);
    setCtaUrl(DEFAULT_CTA_URL);
  }, []);

  const composePayload = useCallback(
    () => ({
      audience,
      profileTargeting,
      subject: subject.trim(),
      headline: headline.trim(),
      body: body.trim(),
      preheader: preheader.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
    }),
    [
      audience,
      profileTargeting,
      subject,
      headline,
      body,
      preheader,
      ctaLabel,
      ctaUrl,
    ],
  );

  const refreshAudience = useCallback(
    async (
      targetAudience: BroadcastEmailAudience,
      targeting: AudienceTargeting,
    ) => {
      if (getAudienceTargetingValidationError(targeting)) {
        return;
      }

      const requestId = ++audienceRequestIdRef.current;
      setLoadingAudience(true);
      setRecipientCount(null);
      setTotalAudience(null);
      setMatchPercentage(null);
      setOptedInCount(null);

      const result = await adminPreviewAudienceTargeting({
        context: "broadcast",
        deliverability: targetAudience,
        profileTargeting: targeting,
      });
      if (requestId !== audienceRequestIdRef.current) {
        return;
      }

      if (!result.ok || !result.data) {
        setRecipientCount(null);
        setTotalAudience(null);
        setMatchPercentage(null);
        setOptedInCount(null);
        toast({
          title: "Could not load audience",
          description: result.error ?? "Try again.",
          variant: "destructive",
        });
      } else {
        setRecipientCount(result.data.matchingRecipients);
        setTotalAudience(result.data.totalAudience);
        setMatchPercentage(result.data.matchPercentage);
        setOptedInCount(result.data.optedInCount ?? null);
      }
      setLoadingAudience(false);
    },
    [toast],
  );

  const audienceTargetingError = useMemo(
    () => getAudienceTargetingValidationError(profileTargeting),
    [profileTargeting],
  );

  const sharedAudiencePreview = useMemo((): AudienceTargetingPreview | null => {
    if (
      audienceTargetingError ||
      recipientCount == null ||
      totalAudience == null ||
      matchPercentage == null
    ) {
      return null;
    }
    return {
      context: "broadcast",
      deliverability: audience,
      profileTargeting,
      totalAudience,
      matchingRecipients: recipientCount,
      matchPercentage,
      optedInCount: optedInCount ?? undefined,
    };
  }, [
    audience,
    audienceTargetingError,
    matchPercentage,
    optedInCount,
    profileTargeting,
    recipientCount,
    totalAudience,
  ]);

  useEffect(() => {
    if (!canBroadcast) return;
    if (audienceTargetingError) {
      audienceRequestIdRef.current += 1;
      setRecipientCount(null);
      setTotalAudience(null);
      setMatchPercentage(null);
      setOptedInCount(null);
      setLoadingAudience(false);
      return;
    }

    setRecipientCount(null);
    setTotalAudience(null);
    setMatchPercentage(null);
    setOptedInCount(null);
    setLoadingAudience(true);

    const timer = window.setTimeout(() => {
      void refreshAudience(audience, profileTargeting);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    canBroadcast,
    audience,
    profileTargeting,
    refreshAudience,
    audienceTargetingError,
  ]);

  const handleExport = async () => {
    if (audienceTargetingError) {
      toast({
        title: "Invalid audience",
        description: audienceTargetingError,
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    const result = await adminExportBroadcastAudienceCsv(
      audience,
      profileTargeting,
    );
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
    if (audienceTargetingError) {
      toast({
        title: "Invalid audience",
        description: audienceTargetingError,
        variant: "destructive",
      });
      return;
    }

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
    if (audienceTargetingError) {
      toast({
        title: "Invalid audience",
        description: audienceTargetingError,
        variant: "destructive",
      });
      return;
    }

    if (recipientCount == null || recipientCount < 1) {
      toast({
        title: "No recipients",
        description:
          recipientCount === 0
            ? "No deliverable recipients match this audience filter."
            : "Refresh the audience preview before sending.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Send this broadcast to ${recipientCount.toLocaleString()} users via Resend?`,
    );
    if (!confirmed) return;

    setSending(true);
    setSendProgress("Queueing broadcast…");

    const result = await adminSendBroadcastEmail({
      ...composePayload(),
      confirmRecipientCount: recipientCount,
      sendImmediately: true,
    });

    if (!result.ok || !result.data?.jobId) {
      setSending(false);
      setSendProgress(null);
      toast({
        title: "Broadcast failed",
        description: result.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }

    const jobId = result.data.jobId;
    const deadline = Date.now() + BROADCAST_JOB_POLL_TIMEOUT_MS;
    let completed = false;
    broadcastPollActiveRef.current = true;

    while (Date.now() < deadline) {
      if (!broadcastPollActiveRef.current) {
        return;
      }

      await sleep(BROADCAST_JOB_POLL_INTERVAL_MS);
      if (!broadcastPollActiveRef.current) {
        return;
      }

      const statusResult = await adminFetchBroadcastEmailJob(jobId);
      if (!broadcastPollActiveRef.current) {
        return;
      }

      if (!statusResult.ok || !statusResult.data) {
        setSendProgress("Waiting for broadcast status…");
        continue;
      }

      const job = statusResult.data;
      if (job.status === "pending") {
        setSendProgress("Preparing broadcast…");
        continue;
      }
      if (job.status === "processing") {
        setSendProgress(
          `Syncing contacts to Resend… ${job.syncedContactCount.toLocaleString()} / ${job.recipientCount.toLocaleString()}`,
        );
        continue;
      }
      if (job.status === "failed") {
        broadcastPollActiveRef.current = false;
        setSending(false);
        setSendProgress(null);
        toast({
          title: "Broadcast failed",
          description:
            job.errorMessage ?? "Check server logs for the latest sync error.",
          variant: "destructive",
        });
        return;
      }
      if (job.status === "completed") {
        completed = true;
        broadcastPollActiveRef.current = false;
        setSending(false);
        setSendProgress(null);
        resetComposeForm();
        toast({
          title: "Broadcast queued in Resend",
          description: job.broadcastId
            ? `Broadcast ${job.broadcastId} — ${job.syncedContactCount.toLocaleString()} contacts synced.`
            : `${job.syncedContactCount.toLocaleString()} contacts synced.`,
        });
        break;
      }
    }

    if (!broadcastPollActiveRef.current) {
      return;
    }

    broadcastPollActiveRef.current = false;

    if (!completed) {
      setSending(false);
      setSendProgress(null);
      toast({
        title: "Broadcast still processing",
        description:
          "This large send is still running in the background. Refresh this page and check Netlify logs if needed.",
        variant: "destructive",
      });
    }
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
              <p className="text-xs text-muted-foreground">Expected recipients</p>
              <p className="text-2xl font-semibold tabular-nums">
                {loadingAudience
                  ? "…"
                  : recipientCount?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Total audience</p>
              <p className="text-lg font-medium tabular-nums">
                {loadingAudience
                  ? "…"
                  : totalAudience?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Match rate</p>
              <p className="text-lg font-medium tabular-nums">
                {loadingAudience
                  ? "…"
                  : matchPercentage != null
                    ? `${matchPercentage}%`
                    : "—"}
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
              onClick={() => void refreshAudience(audience, profileTargeting)}
              disabled={loadingAudience || !!audienceTargetingError}
            >
              Refresh count
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExport()}
              disabled={exporting || !!audienceTargetingError || loadingAudience}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>
        <AudienceTargetingPanel
          value={profileTargeting}
          onChange={setProfileTargeting}
          context="broadcast"
          deliverability={audience}
          sharedPreview={{
            data: sharedAudiencePreview,
            loading: loadingAudience,
          }}
        />
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
          disabled={
            previewing || !composeReady || !!audienceTargetingError
          }
        >
          {previewing ? "Sending preview…" : "Send preview to me"}
        </Button>
        <Button
          onClick={() => void handleSend()}
          disabled={
            sending ||
            loadingAudience ||
            !!audienceTargetingError ||
            !composeReady ||
            recipientCount == null ||
            recipientCount < 1
          }
        >
          {sending ? "Sending…" : "Send broadcast"}
        </Button>
      </div>

      {sendProgress ? (
        <p className="text-sm text-muted-foreground">{sendProgress}</p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Requires `RESEND_BROADCAST_SEGMENT_ID` on the backend. Recipients are
        synced to that Resend segment before the broadcast is created. Resend
        adds per-recipient unsubscribe links automatically.
      </p>
    </div>
  );
}
