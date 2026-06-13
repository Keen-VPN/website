import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminFetchUserProfileSummary,
  type AdminUserProfileAudience,
  type AdminUserProfileQuestionSummary,
  type AdminUserProfileSummary,
} from "@/auth";
import { Button } from "@/components/ui/button";

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function categoryLabel(category: string) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const AUDIENCE_OPTIONS: {
  value: AdminUserProfileAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "all",
    label: "All users",
    description: "Every registered account",
  },
  {
    value: "billing",
    label: "Paying & trial",
    description:
      "Users with an active or trialing subscription, linked subscription members, or a Stripe customer on file",
  },
];

function QuestionBreakdown({
  question,
  loading,
}: {
  question: AdminUserProfileQuestionSummary;
  loading: boolean;
}) {
  const totalAnswers = question.distribution.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {categoryLabel(question.category)}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{question.label}</h3>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">
            Answered:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {loading ? "…" : question.answeredCount}
            </span>
          </p>
          <p className="text-muted-foreground">
            Skipped:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {loading ? "…" : question.skippedCount}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {question.distribution.map((row) => {
          const width =
            totalAnswers > 0 ? Math.round((row.count / totalAnswers) * 100) : 0;
          return (
            <div key={row.value}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span>{row.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {row.count}
                  {totalAnswers > 0 ? ` (${width}%)` : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
        {!loading && question.distribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">No answers recorded yet.</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminUserProfiles() {
  const [audience, setAudience] = useState<AdminUserProfileAudience>("billing");
  const [summary, setSummary] = useState<AdminUserProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (targetAudience: AdminUserProfileAudience) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);
    setSummary(null);

    const res = await adminFetchUserProfileSummary({
      audience: targetAudience,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequest.current !== controller) {
      return;
    }

    if (res.ok && res.data) {
      setSummary(res.data);
    } else {
      setSummary(null);
      setError(res.error ?? "Failed to load user profile summary");
    }

    setLoading(false);
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    void load(audience);
    return () => activeRequest.current?.abort();
  }, [load, audience]);

  const selectedAudience =
    AUDIENCE_OPTIONS.find((option) => option.value === audience) ??
    AUDIENCE_OPTIONS[0];

  const completionRate = summary
    ? formatPercent(summary.profilesCompleted, summary.totalUsers)
    : "—";

  const startRate = summary
    ? formatPercent(summary.profilesStarted, summary.totalUsers)
    : "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User profiles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregated optional profile answers only — no individual user
            responses are shown here.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load(audience)}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">Audience</p>
          <p className="text-sm text-muted-foreground">
            {selectedAudience.description}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-lg border border-border p-1"
          role="group"
          aria-label="Profile audience"
        >
          {AUDIENCE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={audience === option.value ? "default" : "ghost"}
              className="h-8"
              aria-pressed={audience === option.value}
              onClick={() => setAudience(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Users in audience</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.totalUsers ?? (loading ? "…" : 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Trial users</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.trialUsers ?? (loading ? "…" : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active trialing subscription
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Paid users</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.paidUsers ?? (loading ? "…" : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active paid subscription
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Profiles started</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.profilesStarted ?? (loading ? "…" : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? "" : `${startRate} of audience`}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Profiles completed</p>
          <p className="mt-1 text-3xl font-semibold">
            {summary?.profilesCompleted ?? (loading ? "…" : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? "" : `${completionRate} of audience`}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Completion of started</p>
          <p className="mt-1 text-3xl font-semibold">
            {loading
              ? "…"
              : formatPercent(
                  summary?.profilesCompleted ?? 0,
                  summary?.profilesStarted ?? 0,
                )}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Question breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Answer distributions for the selected audience.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {(summary?.questions ?? []).map((question) => (
            <QuestionBreakdown
              key={question.key}
              question={question}
              loading={loading}
            />
          ))}
          {!loading && (summary?.questions.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No profile questions configured.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Profile funnel events</h3>
          <p className="text-sm text-muted-foreground">
            Server-side product events for profile interactions in this audience.
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            {(summary?.analyticsEvents ?? []).map((row) => (
              <div
                key={row.eventName}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="font-mono text-muted-foreground">
                  {row.eventName}
                </span>
                <span className="font-mono tabular-nums">{row.count}</span>
              </div>
            ))}
            {!loading && (summary?.analyticsEvents.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            ) : null}
            {loading && (summary?.analyticsEvents.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
