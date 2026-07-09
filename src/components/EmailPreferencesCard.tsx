import { useCallback, useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { workspaceSectionSurface } from "@/components/workspace/workspace-ui";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getEmailPreferences,
  updateEmailPreferences,
} from "@/auth";

interface EmailPreferencesCardProps {
  sessionToken: string;
}

export function EmailPreferencesCard({ sessionToken }: EmailPreferencesCardProps) {
  const { toast } = useToast();
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const loadPreferences = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(null);
    const response = await getEmailPreferences(sessionToken);
    if (generation !== loadGeneration.current) return;
    if (response.success) {
      setOptIn(response.contextualEngagementOptIn);
    } else {
      setLoadError(response.error ?? "Could not load email preferences");
    }
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void loadPreferences();
    return () => {
      loadGeneration.current += 1;
    };
  }, [loadPreferences]);

  async function handleToggle(checked: boolean) {
    if (loadError) return;

    const previous = optIn;
    setOptIn(checked);
    setSaving(true);

    const response = await updateEmailPreferences(sessionToken, checked);
    setSaving(false);

    if (response.success) {
      setOptIn(response.contextualEngagementOptIn);
      setLoadError(null);
      return;
    }

    setOptIn(previous);
    toast({
      title: "Could not update email preferences",
      description: response.error ?? "Please try again.",
      variant: "destructive",
    });
  }

  return (
    <WorkspacePanel
      title="Email preferences"
      description="Control optional personalized emails from KeenVPN"
    >
        <div className={workspaceSectionSurface}>
          <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="contextual-email-opt-in" className="text-base">
              Domain Insights for Perks
            </Label>
            <p className="text-sm text-muted-foreground">
              We may email you about relevant perks based on domains you visit.
              You can turn this off anytime.
            </p>
            {loadError ? (
              <div className="space-y-1">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => void loadPreferences()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </div>
          {loading || saving ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="contextual-email-opt-in"
              checked={optIn}
              disabled={Boolean(loadError)}
              onCheckedChange={(checked) => void handleToggle(checked)}
            />
          )}
          </div>
        </div>
    </WorkspacePanel>
  );
}
