import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  adminFetchAudienceTargetingOptions,
  adminPreviewAudienceTargeting,
  type AudienceCustomRule,
  type AudiencePreset,
  type AudienceTargeting,
  type AudienceTargetingPreview,
} from "@/auth/backend";

const SEGMENT_PRESETS: AudiencePreset[] = [
  "all_users",
  "has_us_bank_account",
  "no_us_bank_account",
  "receives_direct_deposit",
  "self_employed",
  "business_owner",
  "interested_in_starting_business",
  "custom",
];

export const DEFAULT_AUDIENCE_TARGETING: AudienceTargeting = {
  presets: ["all_users"],
};

interface AudienceTargetingPanelProps {
  value: AudienceTargeting;
  onChange: (value: AudienceTargeting) => void;
  context: "perks" | "broadcast";
  deliverability?: "all_deliverable" | "opted_in";
  disabled?: boolean;
}

export function AudienceTargetingPanel({
  value,
  onChange,
  context,
  deliverability = "all_deliverable",
  disabled = false,
}: AudienceTargetingPanelProps) {
  const [presetLabels, setPresetLabels] = useState<Record<string, string>>({});
  const [questionOptions, setQuestionOptions] = useState<
    Array<{
      key: string;
      label: string;
      options: Array<{ value: string; label: string }>;
    }>
  >([]);
  const [preview, setPreview] = useState<AudienceTargetingPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewRequestIdRef = useRef(0);

  useEffect(() => {
    void adminFetchAudienceTargetingOptions().then((result) => {
      if (!result.ok || !result.data) return;
      const labels: Record<string, string> = {};
      for (const preset of result.data.presets) {
        labels[preset.id] = preset.label;
      }
      setPresetLabels(labels);
      setQuestionOptions(result.data.questions);
    });
  }, []);

  const usesCustom = value.presets.includes("custom");
  const usesAllUsers = value.presets.includes("all_users");

  const togglePreset = (preset: AudiencePreset, checked: boolean) => {
    if (disabled) return;

    if (preset === "all_users") {
      onChange(checked ? { presets: ["all_users"] } : { presets: [] });
      return;
    }

    const withoutAll = value.presets.filter((item) => item !== "all_users");

    if (preset === "custom") {
      if (checked) {
        onChange({
          presets: ["custom"],
          customRules: value.customRules ?? {
            logic: "or",
            rules: [{ questionKey: "us_bank_account", value: "yes" }],
          },
        });
      } else {
        onChange({ presets: [] });
      }
      return;
    }

    const next = checked
      ? [...withoutAll.filter((item) => item !== "custom"), preset]
      : withoutAll.filter((item) => item !== preset);

    onChange({ presets: next });
  };

  const updateCustomRule = (
    index: number,
    patch: Partial<AudienceCustomRule>,
  ) => {
    const rules = value.customRules?.rules ?? [];
    const nextRules = rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule,
    );
    onChange({
      presets: ["custom"],
      customRules: {
        logic: value.customRules?.logic ?? "or",
        rules: nextRules,
      },
    });
  };

  const addCustomRule = () => {
    onChange({
      presets: ["custom"],
      customRules: {
        logic: value.customRules?.logic ?? "or",
        rules: [
          ...(value.customRules?.rules ?? []),
          { questionKey: "us_bank_account", value: "yes" },
        ],
      },
    });
  };

  const removeCustomRule = (index: number) => {
    const rules = (value.customRules?.rules ?? []).filter(
      (_, ruleIndex) => ruleIndex !== index,
    );
    onChange({
      presets: ["custom"],
      customRules: {
        logic: value.customRules?.logic ?? "or",
        rules,
      },
    });
  };

  const refreshPreview = useCallback(async () => {
    if (value.presets.length === 0) {
      setPreview(null);
      setLoadingPreview(false);
      return;
    }
    const requestId = ++previewRequestIdRef.current;
    setLoadingPreview(true);
    const result = await adminPreviewAudienceTargeting({
      context,
      deliverability: context === "broadcast" ? deliverability : undefined,
      profileTargeting: value,
    });
    if (requestId !== previewRequestIdRef.current) return;
    setLoadingPreview(false);
    if (result.ok && result.data) {
      setPreview(result.data);
    }
  }, [context, deliverability, value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  const selectedSummary = useMemo(() => {
    if (value.presets.length === 0) {
      return "No audience selected — choose All users or a specific segment";
    }
    if (usesAllUsers) return "All users";
    if (usesCustom) return "Custom profile rules";
    return value.presets
      .map((preset) => presetLabels[preset] ?? preset)
      .join(" OR ");
  }, [presetLabels, usesAllUsers, usesCustom, value.presets]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <Label className="text-sm font-semibold">Audience targeting</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Use User Information survey answers to personalize who sees this
          content. Multiple presets match if any selected segment applies.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SEGMENT_PRESETS.map((preset) => {
          const checked = value.presets.includes(preset);
          const presetDisabled =
            disabled ||
            (usesAllUsers && preset !== "all_users") ||
            (usesCustom && preset !== "custom" && preset !== "all_users");
          return (
            <label
              key={preset}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                checked ? "border-primary bg-primary/5" : "border-border"
              } ${presetDisabled ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={presetDisabled}
                onChange={(event) =>
                  togglePreset(preset, event.target.checked)
                }
              />
              <span>{presetLabels[preset] ?? preset}</span>
            </label>
          );
        })}
      </div>

      {usesCustom ? (
        <div className="space-y-3 rounded-md border border-dashed border-border p-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Match
            </Label>
            <Select
              value={value.customRules?.logic ?? "or"}
              onValueChange={(logic) =>
                onChange({
                  presets: ["custom"],
                  customRules: {
                    logic: logic as "or" | "and",
                    rules: value.customRules?.rules ?? [],
                  },
                })
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="or">Any rule (OR)</SelectItem>
                <SelectItem value="and">All rules (AND)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(value.customRules?.rules ?? []).map((rule, index) => {
            const question = questionOptions.find(
              (item) => item.key === rule.questionKey,
            );
            return (
              <div
                key={`${rule.questionKey}-${index}`}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Select
                  value={rule.questionKey}
                  onValueChange={(questionKey) =>
                    updateCustomRule(index, {
                      questionKey: questionKey as AudienceCustomRule["questionKey"],
                      value:
                        questionOptions.find((item) => item.key === questionKey)
                          ?.options[0]?.value ?? "yes",
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionOptions.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.value}
                  onValueChange={(answer) =>
                    updateCustomRule(index, { value: answer })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(question?.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => removeCustomRule(index)}
                >
                  Remove
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addCustomRule}
          >
            Add rule
          </Button>
        </div>
      ) : null}

      <div className="rounded-md bg-background/80 p-3 text-sm">
        <div className="font-medium">Audience preview</div>
        <div className="mt-1 text-xs text-muted-foreground">{selectedSummary}</div>
        {loadingPreview ? (
          <p className="mt-2 text-xs text-muted-foreground">Calculating…</p>
        ) : preview ? (
          <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Total audience</dt>
              <dd className="font-semibold">
                {preview.totalAudience.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expected recipients</dt>
              <dd className="font-semibold">
                {preview.matchingRecipients.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Match rate</dt>
              <dd className="font-semibold">{preview.matchPercentage}%</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}
