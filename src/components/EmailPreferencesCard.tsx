import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const response = await getEmailPreferences(sessionToken);
      if (cancelled) return;
      if (response.success) {
        setOptIn(response.contextualEngagementOptIn);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  async function handleToggle(checked: boolean) {
    const previous = optIn;
    setOptIn(checked);
    setSaving(true);

    const response = await updateEmailPreferences(sessionToken, checked);
    setSaving(false);

    if (response.success) {
      setOptIn(response.contextualEngagementOptIn);
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
    <Card>
      <CardHeader>
        <CardTitle>Email preferences</CardTitle>
        <CardDescription>
          Control optional personalized emails from KeenVPN
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="contextual-email-opt-in" className="text-base">
              Personalized tips &amp; offers
            </Label>
            <p className="text-sm text-muted-foreground">
              Optional emails about perks and recommendations based on your
              interests. Off by default.
            </p>
          </div>
          {loading || saving ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="contextual-email-opt-in"
              checked={optIn}
              onCheckedChange={(checked) => void handleToggle(checked)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
